import ENTRY from "./constant/entry.js"

import Compiler from "./caching-compiler.js"
import Entry from "./entry.js"

import _loadESM from "./module/esm/_load.js"
import errors from "./errors.js"
import builtinEntries from "./builtin-entries.js"
import getLocationFromStackTrace from "./error/get-location-from-stack-trace.js"
import getURLFromFilePath from "./util/get-url-from-file-path.js"
import hasPragma from "./parse/has-pragma.js"
import identity from "./util/identity.js"
import isMJS from "./util/is-mjs.js"
import loadESM from "./module/esm/load.js"
import makeRequireFunction from "./module/make-require-function.js"
import setDeferred from "./util/set-deferred.js"
import { setImmediate } from "./safe/timers.js"
import shared from "./shared.js"

const {
  TYPE_ESM
} = ENTRY

const {
  ERR_INVALID_ESM_FILE_EXTENSION,
  ERR_UNDEFINED_IDENTIFIER
} = errors

const ExPromise = __external__.Promise

const indirectEval = __external__.eval

const Runtime = {
  __proto__: null,

  assertTDZ(name, value) {
    if (this.entry.bindings[name]) {
      return value
    }

    const error = new ERR_UNDEFINED_IDENTIFIER(name)

    Error.captureStackTrace(error, Runtime.assertTDZ)

    const loc = getLocationFromStackTrace(error)

    if (loc) {
      error.stack =
        loc.filename + ":" +
        loc.line + "\n" +
        error.stack
    }

    throw error
  },

  compileEval(content) {
    // Section 18.2.1.1: Runtime Semantics: PerformEval ( x, evalRealm, strictCaller, direct )
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

    const { entry } = this
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
      __proto__: null,
      configurable: true,
      get: () => {
        Reflect.deleteProperty(unsafeContext, runtimeName)
        return this
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

    return new ExPromise((resolve, reject) => {
      setImmediate(() => {
        const { entry } = this

        const setterArgsList = [["*", null, createSetter("import", (value, childEntry) => {
          if (childEntry._loaded === 1) {
            resolve(value)
          }
        })]]

        if (Reflect.has(builtinEntries, request)) {
          return watchBuiltin(entry, request, setterArgsList)
        }

        try {
          watchImport(entry, request, setterArgsList, loadESM)
        } catch (e) {
          reject(e)
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
    const { entry } = this

    return Reflect.has(builtinEntries, request)
      ? watchBuiltin(entry, request, setterArgsList)
      : watchImport(entry, request, setterArgsList, _loadESM)
  }
}

function createSetter(from, setter) {
  setter.from = from
  return setter
}

function runCJS(entry, moduleWrapper) {
  const mod = entry.module
  const exported = mod.exports = entry.exports

  entry.exports = null

  return Reflect.apply(moduleWrapper, exported, [
    shared.unsafeContext,
    exported,
    makeRequireFunction(mod)
  ])
}

function runESM(entry, moduleWrapper) {
  const mod = entry.module
  const exported = mod.exports = entry.exports

  entry.exports = null

  let result

  if (entry.package.options.cjs.vars &&
      ! isMJS(mod)) {
    result = Reflect.apply(moduleWrapper, exported, [
      shared.unsafeContext,
      exported,
      makeRequireFunction(mod)
    ])
  } else {
    result = Reflect.apply(moduleWrapper, void 0, [
      shared.unsafeContext
    ])
  }

  let { loaded } = mod

  Reflect.defineProperty(mod, "loaded", {
    __proto__: null,
    configurable: true,
    enumerable: true,
    get: () => loaded,
    set(value) {
      if (value) {
        Reflect.defineProperty(mod, "loaded", {
          __proto__: null,
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

function watchBuiltin(entry, request, setterArgsList) {
  entry.module.require(request)

  builtinEntries[request]
    .addSetters(setterArgsList, entry)
    .update()
}

function watchImport(entry, request, setterArgsList, loader) {
  const { moduleState } = shared

  moduleState.passthru = true
  moduleState.requireDepth += 1

  const mod = entry.module

  let childEntry

  try {
    childEntry = loader(request, mod, false, (childEntry) => {
      const childMod = childEntry.module

      if (childEntry.type === TYPE_ESM &&
          isMJS(mod) &&
          ! isMJS(childMod)) {
        throw ERR_INVALID_ESM_FILE_EXTENSION(childMod)
      }

      childEntry.addSetters(setterArgsList, entry)
    })
  } finally {
    moduleState.passthru = false
    moduleState.requireDepth -= 1
  }

  if (childEntry.builtin) {
    mod.require(childEntry.name)
  } else {
    entry._requireESM = true
    mod.require(request)
    childEntry.loaded()
  }

  childEntry.update()
}

export default Runtime
