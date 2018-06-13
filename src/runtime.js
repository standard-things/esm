import ENTRY from "./constant/entry.js"

import Compiler from "./caching-compiler.js"
import Entry from "./entry.js"
import Module from "./module.js"

import _loadESM from "./module/esm/_load.js"
import builtinGlobal from "./global.js"
import errors from "./errors.js"
import getURLFromFilePath from "./util/get-url-from-file-path.js"
import hasPragma from "./parse/has-pragma.js"
import identity from "./util/identity.js"
import isError from "./util/is-error.js"
import isMJS from "./util/is-mjs.js"
import isPath from "./util/is-path.js"
import loadESM from "./module/esm/load.js"
import makeRequireFunction from "./module/make-require-function.js"
import { resolve } from "./safe/path.js"
import resolveFilename from "./module/esm/resolve-filename.js"
import setDeferred from "./util/set-deferred.js"
import { setImmediate } from "./safe/timers.js"
import shared from "./shared.js"

const {
  TYPE_CJS,
  TYPE_ESM
} = ENTRY

const {
  ERR_INVALID_ESM_FILE_EXTENSION,
  ERR_UNDEFINED_IDENTIFIER
} = errors

const { external } = shared

const ExPromise = external.Promise

const indirectEval = external.eval

const Runtime = {
  assertTDZ(name, value) {
    if (this.entry.bindings[name]) {
      return value
    }

    throw new ERR_UNDEFINED_IDENTIFIER(name, Runtime.assertTDZ)
  },

  compileEval(content) {
    // Section 18.2.1.1: PerformEval()
    // Setp 2: Only evaluate strings.
    // https://tc39.github.io/ecma262/#sec-performeval
    return typeof content === "string"
      ? Compiler.compile(this.entry, content, { eval: true }).code
      : content
  },

  compileGlobalEval(content) {
    if (typeof content !== "string") {
      return content
    }

    const runtime = this
    const { entry } = runtime
    const result = Compiler.compile(entry, content, { eval: true })

    if (! result.changed) {
      return content
    }

    const { runtimeName } = entry
    const { unsafeContext } = shared

    content = result.code

    if (unsafeContext[runtimeName]) {
      return content
    }

    content =
      (hasPragma(content, "use strict") ? '"use strict";' : "") +
      "let " + runtimeName + "=global." + runtimeName + ";" +
      content

    Reflect.defineProperty(unsafeContext, runtimeName, {
      configurable: true,
      get() {
        Reflect.deleteProperty(this, runtimeName)
        return runtime
      }
    })

    return content
  },

  // Register a getter function that always returns the given value.
  default(value) {
    this.export([["default", () => value]])
  },

  enable(entry, exported) {
    const { id } = entry
    const mod = entry.module
    const object = mod.exports

    Entry.set(mod, entry)
    Entry.set(exported, entry)

    entry.exports = exported

    object.compileGlobalEval = Runtime.compileGlobalEval
    object.entry = entry

    setDeferred(object, "meta", () => {
      return {
        __proto__: null,
        url: id.startsWith("file:") ? id : getURLFromFilePath(id)
      }
    })

    object._ = object
    object.c = object.compileEval = Runtime.compileEval.bind(object)
    object.d = object.default = Runtime.default
    object.e = object.export = Runtime.export
    object.g = object.globalEval = Runtime.globalEval.bind(object)
    object.i = object.import = Runtime.import
    object.k = identity
    object.n = object.nsSetter = Runtime.nsSetter
    object.r = object.run = Runtime.run
    object.t = object.assertTDZ = Runtime.assertTDZ
    object.u = object.update = Runtime.update
    object.v = indirectEval
    object.w = object.watch = Runtime.watch
  },

  // Register getter functions for local variables in the scope of an export
  // statement. Pass true as the second argument to indicate that the getter
  // functions always return the same values.
  export(getterArgsList) {
    this.entry.addGetters(getterArgsList)
  },

  globalEval(content) {
    return indirectEval(this.compileGlobalEval(content))
  },

  import(request) {
    // Section 2.2.1: Runtime Semantics: Evaluation
    // Step 6: Coerce request to a string.
    // https://tc39.github.io/proposal-dynamic-import/#sec-import-call-runtime-semantics-evaluation
    if (typeof request !== "string") {
      request = String(request)
    }

    return new ExPromise((resolvePromise, rejectPromise) => {
      setImmediate(() => {
        const { entry } = this

        const setterArgsList = [["*", null, createSetter("import", (value, childEntry) => {
          if (childEntry._loaded === 1) {
            resolvePromise(value)
          }
        })]]

        try {
          watchImport(entry, request, setterArgsList, loadESM)
        } catch (e) {
          rejectPromise(e)
        }
      })
    })
  },

  nsSetter() {
    return createSetter("nsSetter", (value, childEntry) => {
      this.entry.addGettersFrom(childEntry)
    })
  },

  run(moduleWrapper) {
    const { entry } = this
    const runner =  entry.type === TYPE_ESM ? runESM : runCJS

    return runner(entry, moduleWrapper)
  },

  update(valueToPassThrough) {
    this.entry.update()

    // Returns the `valueToPassThrough` parameter to allow the value of the
    // original expression to pass through. For example,
    //
    //   export let a = 1
    //   a += 3
    //
    // becomes
    //
    //   runtime.export("a", () => a)
    //   let a = 1
    //   runtime.update(a += 3)
    //
    // This ensures `entry.update()` runs immediately after the assignment,
    // and does not interfere with the larger computation.
    return valueToPassThrough
  },

  watch(request, setterArgsList) {
    return watchImport(this.entry, request, setterArgsList, _loadESM)
  }
}

function createSetter(from, setter) {
  setter.from = from
  return setter
}

function getEntryFrom(request, exported) {
  const entry = shared.entry.cache.get(exported)

  if (entry) {
    return entry
  }

  const filename = tryResolveFilename(request)
  const child = new Module(filename, null)

  if (isPath(filename)) {
    child.filename = filename
  }

  child.exports = exported
  child.loaded = true
  return Entry.get(child)
}

function runCJS(entry, moduleWrapper) {
  const mod = entry.module
  const exported = mod.exports = entry.exports

  return Reflect.apply(moduleWrapper, exported, [
    builtinGlobal,
    exported,
    makeRequireFunction(mod)
  ])
}

function runESM(entry, moduleWrapper) {
  const mod = entry.module
  const exported = mod.exports = entry.exports

  let result

  if (entry.package.options.cjs.vars &&
      ! isMJS(mod)) {
    result = Reflect.apply(moduleWrapper, exported, [
      builtinGlobal,
      exported,
      makeRequireFunction(mod)
    ])
  } else {
    result = Reflect.apply(moduleWrapper, void 0, [
      builtinGlobal
    ])
  }

  let { loaded } = mod

  Reflect.defineProperty(mod, "loaded", {
    configurable: true,
    enumerable: true,
    get: () => loaded,
    set(value) {
      if (value) {
        Reflect.defineProperty(this, "loaded", {
          configurable: true,
          enumerable: true,
          value,
          writable: true
        })

        entry.update().loaded()
      } else {
        loaded = value
      }
    }
  })

  return result
}

function tryResolveFilename(request, parent) {
  try {
    return resolveFilename(request, parent)
  } catch (e) {}

  try {
    return Module._resolveFilename(request, parent)
  } catch (e) {}

  if (isPath(request)) {
    let parentFilename = parent && parent.filename

    if (typeof parentFilename !== "string") {
      parentFilename = ""
    }

    return resolve(parentFilename, request)
  }

  return request
}

function watchImport(entry, request, setterArgsList, loader) {
  const mod = entry.module
  const { moduleState } = shared

  let child
  let childEntry
  let error
  let threw = false

  moduleState.parseOnly = true
  moduleState.requireDepth += 1

  try {
    childEntry = loader(request, mod, false, (childEntry) => {
      child = childEntry.module

      if (childEntry.type === TYPE_ESM &&
          isMJS(mod) &&
          ! isMJS(child)) {
        throw ERR_INVALID_ESM_FILE_EXTENSION(child)
      }

      childEntry.addSetters(setterArgsList, entry)
    })
  } catch (e) {
    error = e
    threw = true
  }

  moduleState.parseOnly = false
  moduleState.requireDepth -= 1

  if (threw &&
      (! entry.package.options.cjs.paths ||
       isMJS(mod) ||
       ! isError(error) ||
       error.code !== "MODULE_NOT_FOUND")) {
    throw error
  }

  let exported

  entry._require = TYPE_ESM
  moduleState.requireDepth += 1

  try {
    exported = mod.require(request)
  } finally {
    entry._require = TYPE_CJS
    moduleState.requireDepth -= 1
  }

  if (! childEntry) {
    // Create the child entry for unresolved mocked requests.
    childEntry = getEntryFrom(request, exported)
    child = childEntry.module
    entry.children[childEntry.name] = childEntry
    childEntry.addSetters(setterArgsList, entry)
  }

  let mockEntry

  if (child.exports !== exported) {
    mockEntry =
    entry.children[childEntry.name] = getEntryFrom(request, exported)

    // Update the mock entry before the original child entry so dynamic import
    // requests are resolved with the mock entry instead of the child entry.
    mockEntry.addSetters(setterArgsList, entry)
    mockEntry.loaded()
    mockEntry.update()
  }

  childEntry.loaded()
  childEntry.update()

  if (mockEntry) {
    // Update the mock entry after the original child entry so static import
    // requests are updated with mock entry setters last.
    mockEntry.update()
  }
}

export default Runtime
