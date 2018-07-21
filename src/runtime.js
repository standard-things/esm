import ENTRY from "./constant/entry.js"

import Compiler from "./caching-compiler.js"
import Entry from "./entry.js"
import Module from "./module.js"

import _loadESM from "./module/esm/_load.js"
import builtinGlobal from "./builtin/global.js"
import call from "./util/call.js"
import errors from "./errors.js"
import getURLFromFilePath from "./util/get-url-from-file-path.js"
import hasPragma from "./parse/has-pragma.js"
import identity from "./util/identity.js"
import isError from "./util/is-error.js"
import isMJS from "./path/is-mjs.js"
import isPath from "./util/is-path.js"
import loadESM from "./module/esm/load.js"
import makeRequireFunction from "./module/make-require-function.js"
import { resolve } from "./safe/path.js"
import resolveFilename from "./module/esm/resolve-filename.js"
import setDeferred from "./util/set-deferred.js"
import { setImmediate } from "./safe/timers.js"
import setProperty from "./util/set-property.js"
import shared from "./shared.js"

const {
  TYPE_CJS,
  TYPE_ESM
} = ENTRY

const {
  ERR_INVALID_ESM_FILE_EXTENSION,
  ERR_UNDEFINED_IDENTIFIER
} = errors

const {
  Promise: ExPromise,
  eval: evalIndirect
} = shared.external

const Runtime = {
  addDefaultValue(value) {
    this.addExportGetter([["default", () => value]])
  },

  addExportGetter(getterArgsList) {
    this.entry.addGetters(getterArgsList)
  },

  addNamespaceSetter() {
    return createSetter("namespace", (value, childEntry) => {
      this.entry.addGettersFrom(childEntry)
    })
  },

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
    const { unsafeGlobal } = shared

    content = result.code

    if (unsafeGlobal[runtimeName]) {
      return content
    }

    content =
      (hasPragma(content, "use strict") ? '"use strict";' : "") +
      "let " + runtimeName + "=global." + runtimeName + ";" +
      content

    Reflect.defineProperty(unsafeGlobal, runtimeName, {
      configurable: true,
      get() {
        Reflect.deleteProperty(this, runtimeName)
        return runtime
      }
    })

    return content
  },

  enable(entry, exported) {
    const { id } = entry
    const mod = entry.module
    const object = mod.exports

    const boundCompileEval = (code) => Runtime.compileEval.call(object, code)
    const boundEvalGlobal = (code) => Runtime.evalGlobal.call(object, code)

    Entry.set(mod, entry)
    Entry.set(exported, entry)

    entry.exports = exported

    setDeferred(object, "meta", () => {
      return {
        __proto__: null,
        url: id.startsWith("file:") ? id : getURLFromFilePath(id)
      }
    })

    object.addDefaultValue = Runtime.addDefaultValue
    object.addExportGetter = Runtime.addExportGetter
    object.addNamespaceSetter = Runtime.addNamespaceSetter
    object.assertTDZ = Runtime.assertTDZ
    object.compileEval = boundCompileEval
    object.compileGlobalEval = Runtime.compileGlobalEval
    object.entry = entry
    object.evalGlobal = boundEvalGlobal
    object.global = builtinGlobal
    object.importDynamic = Runtime.importDynamic
    object.importStatic = Runtime.importStatic
    object.run = Runtime.run
    object.throwUndefinedIdentifier = Runtime.throwUndefinedIdentifier
    object.updateBindings = Runtime.updateBindings

    object._ = object
    object.a = object.assertTDZ
    object.c = object.compileEval
    object.d = object.addDefaultValue
    object.g = object.global
    object.e = object.evalGlobal
    object.i = object.importDynamic
    object.k = identity
    object.n = object.addNamespaceSetter
    object.r = object.run
    object.t = object.throwUndefinedIdentifier
    object.u = object.updateBindings
    object.v = evalIndirect
    object.w = object.importStatic
    object.x = object.addExportGetter
  },

  evalGlobal(content) {
    return evalIndirect(this.compileGlobalEval(content))
  },

  importDynamic(request) {
    // Section 2.2.1: Runtime Semantics: Evaluation
    // Step 6: Coerce request to a string.
    // https://tc39.github.io/proposal-dynamic-import/#sec-import-call-runtime-semantics-evaluation
    if (typeof request !== "string") {
      request = String(request)
    }

    return new ExPromise((resolvePromise, rejectPromise) => {
      setImmediate(() => {
        const { entry } = this

        const setterArgsList = [["*", null, createSetter("dynamic", (value, childEntry) => {
          if (childEntry._loaded === 1) {
            resolvePromise(value)
          }
        })]]

        try {
          importModule(entry, request, setterArgsList, loadESM)
        } catch (e) {
          rejectPromise(e)
        }
      })
    })
  },

  importStatic(request, setterArgsList) {
    return importModule(this.entry, request, setterArgsList, _loadESM)
  },

  run(moduleWrapper) {
    const { entry } = this
    const runner =  entry.type === TYPE_ESM ? runESM : runCJS

    return runner(entry, moduleWrapper)
  },

  throwUndefinedIdentifier(name) {
    throw new ERR_UNDEFINED_IDENTIFIER(name, Runtime.throwUndefinedIdentifier)
  },

  updateBindings(valueToPassThrough) {
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
  }
}

function createSetter(type, setter) {
  setter.type = type
  return setter
}

function getEntryFrom(request, exported) {
  const entry = shared.entry.cache.get(exported)

  if (entry) {
    return entry
  }

  const filename = tryResolveFilename(request)
  const child = new Module(filename)

  if (isPath(filename)) {
    child.filename = filename
  }

  child.exports = exported
  child.loaded = true
  return Entry.get(child)
}

function importModule(entry, request, setterArgsList, loader) {
  const mod = entry.module
  const { filename } = mod
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
          isMJS(filename) &&
          ! isMJS(child.filename)) {
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
       isMJS(filename) ||
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

function runCJS(entry, moduleWrapper) {
  const mod = entry.module
  const exported = mod.exports = entry.exports

  return Reflect.apply(moduleWrapper, exported, [
    exported,
    makeRequireFunction(mod)
  ])
}

function runESM(entry, moduleWrapper) {
  const mod = entry.module
  const exported = mod.exports = entry.exports

  let result

  if (entry.package.options.cjs.vars &&
      ! isMJS(mod.filename)) {
    result = Reflect.apply(moduleWrapper, exported, [
      exported,
      makeRequireFunction(mod)
    ])
  } else {
    result = call(moduleWrapper)
  }

  let { loaded } = mod

  Reflect.defineProperty(mod, "loaded", {
    configurable: true,
    enumerable: true,
    get: () => loaded,
    set(value) {
      if (value) {
        setProperty(this, "loaded", value)
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
    const parentFilename = parent && parent.filename

    return typeof parentFilename === "string"
      ? resolve(parentFilename, request)
      : resolve(request)
  }

  return request
}

export default Runtime
