import ENTRY from "./constant/entry.js"

import CachingCompiler from "./caching-compiler.js"
import Loader from "./loader.js"

import builtinGlobal from "./builtin/global.js"
import errors from "./errors.js"
import esmImport from "./module/esm/import.js"
import getURLFromFilePath from "./util/get-url-from-file-path.js"
import hasPragma from "./parse/has-pragma.js"
import identity from "./util/identity.js"
import isFileOrigin from "./util/is-file-origin.js"
import isStackTraceMaskable from "./util/is-stack-trace-maskable.js"
import makeRequireFunction from "./module/internal/make-require-function.js"
import maskStackTrace from "./error/mask-stack-trace.js"
import setDeferred from "./util/set-deferred.js"
import { setImmediate } from "./safe/timers.js"
import shared from "./shared.js"
import toExternalError from "./util/to-external-error.js"
import validateShallow from "./module/esm/validate-shallow.js"

const {
  ERROR_GETTER,
  ERROR_STAR,
  LOAD_COMPLETED,
  NAMESPACE_FINALIZATION_COMPLETED,
  NAMESPACE_FINALIZATION_DEFERRED,
  SETTER_TYPE_DYNAMIC_IMPORT,
  SETTER_TYPE_EXPORT_FROM,
  SETTER_TYPE_NAMESPACE,
  TYPE_ESM,
  UPDATE_TYPE_LIVE
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

    if (value === void 0) {
      this.initBindings(["default"])
    }
  },
  addExportFromSetter(importedName, exportedName = importedName) {
    const setter = createSetter(SETTER_TYPE_EXPORT_FROM, (value, childEntry) => {
      const { entry } = this

      if (childEntry.type !== TYPE_ESM &&
          entry._namespaceFinalized !== NAMESPACE_FINALIZATION_COMPLETED) {
        entry._namespaceFinalized = NAMESPACE_FINALIZATION_DEFERRED
      }

      entry.addGetterFrom(childEntry, importedName, exportedName)
    })

    setter.exportedName = exportedName
    return setter
  },
  addExportGetters(getterArgsList) {
    this.entry.addGetters(getterArgsList)
  },
  addNamespaceSetter() {
    return createSetter(SETTER_TYPE_NAMESPACE, (value, childEntry) => {
      const { entry } = this
      const childIsESM = childEntry.type === TYPE_ESM
      const childIsLoaded = childEntry._loaded === LOAD_COMPLETED

      if (! childIsESM &&
          ! childIsLoaded) {
        entry._namespaceFinalized = NAMESPACE_FINALIZATION_DEFERRED
        return
      }

      const childGetters = childEntry.getters
      const { getters, name } = entry

      const namespace = childIsLoaded
        ? childEntry.getExportByName("*", entry)
        : childEntry._namespace

      for (const exportedName in namespace) {
        if (exportedName === "default") {
          continue
        }

        let getter
        let ownerName

        if (Reflect.has(getters, exportedName)) {
          getter = getters[exportedName]
          ownerName = getter.owner.name

          if (name === ownerName) {
            continue
          }
        }

        if (! Reflect.has(childGetters, exportedName)) {
          continue
        }

        const childOwnerName = childGetters[exportedName].owner.name

        if (getter === void 0 ||
            ownerName === childOwnerName) {
          entry.addGetterFrom(childEntry, exportedName)

          if (! Reflect.has(getters, exportedName)) {
            continue
          }
        }

        ownerName = getters[exportedName].owner.name

        if (ownerName !== name &&
            ownerName !== childOwnerName) {
          entry.addGetter(exportedName, () => ERROR_STAR)
        }
      }
    })
  },
  assertImportedBinding: function assertImportedBinding(name, value) {
    if (this.entry.importedBindings[name] !== true) {
      throw new ERR_UNDEFINED_IDENTIFIER(name, assertImportedBinding)
    }

    return value
  },
  compileEval(content) {
    // Section 18.2.1.1: PerformEval()
    // Setp 2: Only evaluate strings.
    // https://tc39.github.io/ecma262/#sec-performeval
    if (typeof content !== "string") {
      return content
    }

    const { entry } = this
    const { cjs } = entry.package.options

    try {
      return CachingCompiler.compile(content, {
        cjsVars: cjs.vars,
        eval: true,
        runtimeName: entry.runtimeName,
        topLevelReturn: cjs.topLevelReturn
      }).code
    } catch (e) {
      if (! Loader.state.package.default.options.debug &&
          isStackTraceMaskable(e)) {
        maskStackTrace(e, {
          content,
          filename: "eval",
          inModule: entry.type === TYPE_ESM
        })
      } else {
        toExternalError(e)
      }

      throw e
    }
  },
  compileGlobalEval(content) {
    if (typeof content !== "string") {
      return content
    }

    const { entry } = this
    const { cjs } = entry.package.options
    const { runtimeName } = entry

    let code

    try {
      const compileData = CachingCompiler.compile(content, {
        cjsVars: cjs.vars,
        eval: true,
        runtimeName,
        topLevelReturn: cjs.topLevelReturn
      })

      if (! compileData.changed) {
        return content
      }

      code = compileData.code
    } catch (e) {
      if (! Loader.state.package.default.options.debug &&
          isStackTraceMaskable(e)) {
        maskStackTrace(e, {
          content,
          filename: "eval",
          inModule: entry.type === TYPE_ESM
        })
      } else {
        toExternalError(e)
      }

      throw e
    }

    const { unsafeGlobal } = shared

    if (Reflect.has(unsafeGlobal, runtimeName)) {
      return code
    }

    const runtime = this

    Reflect.defineProperty(unsafeGlobal, runtimeName, {
      configurable: true,
      get() {
        Reflect.deleteProperty(this, runtimeName)
        return runtime
      }
    })

    code =
      (hasPragma(code, "use strict") ? '"use strict";' : "") +
      "let " + runtimeName + "=global." + runtimeName + ";" +
      code

    return code
  },
  dynamicImport(request) {
    return new ExPromise((resolvePromise, rejectPromise) => {
      setImmediate(() => {
        try {
          // Section 2.2.1: Runtime Semantics: Evaluation
          // Step 6: Coerce request to a string.
          // https://tc39.github.io/proposal-dynamic-import/#sec-import-call-runtime-semantics-evaluation
          if (typeof request !== "string") {
            request = request + ""
          }

          let lastEntry
          let lastValue
          let timerId

          const setterArgsList = [["*", null, createSetter(SETTER_TYPE_DYNAMIC_IMPORT, (value, childEntry) => {
            if (childEntry._loaded === LOAD_COMPLETED) {
              lastEntry = childEntry
              lastValue = value

              if (timerId === void 0) {
                timerId = setImmediate(() => {
                  validateShallow(lastEntry)
                  resolvePromise(lastValue)
                })
              }

              return true
            }
          })]]

          esmImport(request, this.entry, setterArgsList, true)
        } catch (e) {
          if (! Loader.state.package.default.options.debug &&
              isStackTraceMaskable(e)) {
            maskStackTrace(e, { inModule: true })
          } else {
            toExternalError(e)
          }

          rejectPromise(e)
        }
      })
    })
  },
  enable(entry, exported) {
    if (entry.runtime !== null) {
      return entry.runtime
    }

    const mod = entry.module
    const runtime = mod.exports

    const boundCompileEval = (code) => Runtime.compileEval.call(runtime, code)
    const boundGlobalEval = (code) => Runtime.globalEval.call(runtime, code)

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
    runtime.addExportFromSetter = Runtime.addExportFromSetter
    runtime.addExportGetters = Runtime.addExportGetters
    runtime.addNamespaceSetter = Runtime.addNamespaceSetter
    runtime.assertImportedBinding = Runtime.assertImportedBinding
    runtime.compileEval = boundCompileEval
    runtime.compileGlobalEval = Runtime.compileGlobalEval
    runtime.dynamicImport = Runtime.dynamicImport
    runtime.entry = entry
    runtime.global = builtinGlobal
    runtime.globalEval = boundGlobalEval
    runtime.import = Runtime.import
    runtime.initBindings = Runtime.initBindings
    runtime.resumeChildren = Runtime.resumeChildren
    runtime.run = Runtime.run
    runtime.throwConstAssignment = Runtime.throwConstAssignment
    runtime.throwUndefinedIdentifier = Runtime.throwUndefinedIdentifier
    runtime.updateBindings = Runtime.updateBindings

    runtime._ = runtime
    runtime.a = runtime.assertImportedBinding
    runtime.b = runtime.throwConstAssignment
    runtime.c = runtime.compileEval
    runtime.d = runtime.addDefaultValue
    runtime.e = runtime.globalEval
    runtime.f = runtime.addExportFromSetter
    runtime.g = runtime.global
    runtime.i = runtime.dynamicImport
    runtime.j = runtime.initBindings
    runtime.k = identity
    runtime.n = runtime.addNamespaceSetter
    runtime.o = ERROR_GETTER
    runtime.r = runtime.run
    runtime.s = runtime.resumeChildren
    runtime.t = runtime.throwUndefinedIdentifier
    runtime.u = runtime.updateBindings
    runtime.v = evalIndirect
    runtime.w = runtime.import
    runtime.x = runtime.addExportGetters

    return entry.runtime = runtime
  },
  globalEval(content) {
    return evalIndirect(this.compileGlobalEval(content))
  },
  import(request, setterArgsList) {
    return esmImport(request, this.entry, setterArgsList)
  },
  initBindings(names) {
    this.entry.updateBindings(names)
  },
  resumeChildren() {
    this.entry.resumeChildren()
  },
  run(moduleWrapper) {
    const { entry } = this
    const runner =  entry.type === TYPE_ESM ? runESM : runCJS

    return this._runResult = runner(entry, moduleWrapper)
  },
  throwConstAssignment: function throwConstAssignment() {
    throw new ERR_CONST_ASSIGNMENT(throwConstAssignment)
  },
  throwUndefinedIdentifier: function throwUndefinedIdentifier(name) {
    throw new ERR_UNDEFINED_IDENTIFIER(name, throwUndefinedIdentifier)
  },
  updateBindings(valueToPassThrough) {
    this.entry.updateBindings(null, UPDATE_TYPE_LIVE)

    // Returns the `valueToPassThrough()` parameter to allow the value of the
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
  const exported = entry.exports

  mod.exports = exported

  return Reflect.apply(moduleWrapper, exported, [
    exported,
    makeRequireFunction(mod)
  ])
}

function runESM(entry, moduleWrapper) {
  const mod = entry.module
  const exported = entry.exports

  mod.exports = exported

  if (entry.package.options.cjs.vars &&
      entry.extname !== ".mjs") {
    return Reflect.apply(moduleWrapper, exported, [
      exported,
      makeRequireFunction(mod)
    ])
  }

  return Reflect.apply(moduleWrapper, void 0, [])
}

export default Runtime
