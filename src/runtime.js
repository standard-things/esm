import ENTRY from "./constant/entry.js"

import Compiler from "./caching-compiler.js"
import Entry from "./entry.js"

import builtinGlobal from "./builtin/global.js"
import call from "./util/call.js"
import errors from "./errors.js"
import esmImport from "./module/esm/import.js"
import getURLFromFilePath from "./util/get-url-from-file-path.js"
import hasPragma from "./parse/has-pragma.js"
import identity from "./util/identity.js"
import isFileOrigin from "./util/is-file-origin.js"
import makeRequireFunction from "./module/internal/make-require-function.js"
import setDeferred from "./util/set-deferred.js"
import { setImmediate } from "./safe/timers.js"
import setProperty from "./util/set-property.js"
import shared from "./shared.js"

const {
  TYPE_ESM
} = ENTRY

const {
  ERR_CONST_ASSIGNMENT,
  ERR_UNDEFINED_IDENTIFIER
} = errors

const {
  Promise: ExPromise,
  eval: evalIndirect
} = shared.external

const Runtime = {
  addDefaultValue(value) {
    this.addExportGetters([["default", () => value]])
  },

  addExportGetters(getterArgsList) {
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
    const mod = entry.module
    const runtime = mod.exports

    const boundCompileEval = (code) => Runtime.compileEval.call(runtime, code)
    const boundEvalGlobal = (code) => Runtime.evalGlobal.call(runtime, code)

    Entry.set(mod, entry)
    Entry.set(exported, entry)

    entry.exports = exported

    setDeferred(runtime, "meta", () => {
      const { id } = entry

      return {
        __proto__: null,
        url: isFileOrigin(id) ? id : getURLFromFilePath(id)
      }
    })

    runtime._runResult = void 0
    runtime.addDefaultValue = Runtime.addDefaultValue
    runtime.addExportGetters = Runtime.addExportGetters
    runtime.addNamespaceSetter = Runtime.addNamespaceSetter
    runtime.assertTDZ = Runtime.assertTDZ
    runtime.compileEval = boundCompileEval
    runtime.compileGlobalEval = Runtime.compileGlobalEval
    runtime.entry = entry
    runtime.evalGlobal = boundEvalGlobal
    runtime.global = builtinGlobal
    runtime.importDynamic = Runtime.importDynamic
    runtime.importStatic = Runtime.importStatic
    runtime.run = Runtime.run
    runtime.throwConstAssignment = Runtime.throwConstAssignment
    runtime.throwUndefinedIdentifier = Runtime.throwUndefinedIdentifier
    runtime.updateBindings = Runtime.updateBindings

    runtime._ = runtime
    runtime.a = runtime.assertTDZ
    runtime.b = runtime.throwConstAssignment
    runtime.c = runtime.compileEval
    runtime.d = runtime.addDefaultValue
    runtime.e = runtime.evalGlobal
    runtime.g = runtime.global
    runtime.i = runtime.importDynamic
    runtime.k = identity
    runtime.n = runtime.addNamespaceSetter
    runtime.r = runtime.run
    runtime.t = runtime.throwUndefinedIdentifier
    runtime.u = runtime.updateBindings
    runtime.v = evalIndirect
    runtime.w = runtime.importStatic
    runtime.x = runtime.addExportGetters

    return runtime
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
        try {
          esmImport(this.entry, request, [["*", null, createSetter("dynamic", (value, childEntry) => {
            if (childEntry._loaded === 1) {
              resolvePromise(value)
            }
          })]])
        } catch (e) {
          rejectPromise(e)
        }
      })
    })
  },

  importStatic(request, setterArgsList) {
    return esmImport(this.entry, request, setterArgsList)
  },

  run(moduleWrapper) {
    const { entry } = this
    const runner =  entry.type === TYPE_ESM ? runESM : runCJS

    return this._runResult = runner(entry, moduleWrapper)
  },

  throwConstAssignment() {
    throw new ERR_CONST_ASSIGNMENT(Runtime.throwConstAssignment)
  },

  throwUndefinedIdentifier(name) {
    throw new ERR_UNDEFINED_IDENTIFIER(name, Runtime.throwUndefinedIdentifier)
  },

  updateBindings(valueToPassThrough) {
    this.entry.updateBindings()

    // Returns the `valueToPassThrough` parameter to allow the value of the
    // original expression to pass through. For example,
    //
    //   export let a = 1
    //   a += 3
    //
    // becomes
    //
    //   runtime.addExportGetters([["a", () => a]])
    //   let a = 1
    //   runtime.updateBindings(a += 3)
    //
    // This ensures `entry.updateBindings()` runs immediately after assignment,
    // without interfering with the larger computation.
    return valueToPassThrough
  }
}

function createSetter(type, setter) {
  setter.type = type
  return setter
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
      entry.extname !== ".mjs") {
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
        entry.updateBindings().loaded()
      } else {
        loaded = value
      }
    }
  })

  return result
}

export default Runtime
