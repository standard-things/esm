import COMPILER from "../../constant/compiler.js"
import ENTRY from "../../constant/entry.js"
import ENV from "../../constant/env.js"
import MESSAGE from "../../constant/message.js"
import PACKAGE from "../../constant/package.js"

import CachingCompiler from "../../caching-compiler.js"
import Entry from "../../entry.js"
import GenericObject from "../../generic/object.js"
import Loader from "../../loader.js"
import Runtime from "../../runtime.js"
import SafeJSON from "../../safe/json.js"

import assign from "../../util/assign.js"
import captureStackTrace from "../../error/capture-stack-trace.js"
import compileSource from "./compile-source.js"
import constructError from "../../error/construct-error.js"
import emptyArray from "../../util/empty-array.js"
import errors from "../../parse/errors.js"
import esmImport from "../../module/esm/import.js"
import get from "../../util/get.js"
import getLocationFromStackTrace from "../../error/get-location-from-stack-trace.js"
import getSourceMappingURL from "../../util/get-source-mapping-url.js"
import getStackFrames from "../../error/get-stack-frames.js"
import has from "../../util/has.js"
import isAbsolute from "../../path/is-absolute.js"
import isIdentifierName from "../../util/is-identifier-name.js"
import isObjectEmpty from "../../util/is-object-empty.js"
import isOwnPath from "../../util/is-own-path.js"
import isStackTraceMaskable from "../../util/is-stack-trace-maskable.js"
import keys from "../../util/keys.js"
import maskStackTrace from "../../error/mask-stack-trace.js"
import protoCompile from "../proto/compile.js"
import readFile from "../../fs/read-file.js"
import setProperty from "../../util/set-property.js"
import shared from "../../shared.js"
import stripBOM from "../../util/strip-bom.js"
import toExternalError from "../../util/to-external-error.js"
import toExternalFunction from "../../util/to-external-function.js"
import toString from "../../util/to-string.js"

const {
  SOURCE_TYPE_JSON,
  SOURCE_TYPE_MODULE,
  SOURCE_TYPE_SCRIPT,
  SOURCE_TYPE_UNAMBIGUOUS,
  SOURCE_TYPE_WASM,
  TRANSFORMS_EVAL
} = COMPILER

const {
  ERROR_GETTER,
  NAMESPACE_FINALIZATION_DEFERRED,
  STATE_EXECUTION_COMPLETED,
  STATE_EXECUTION_STARTED,
  STATE_INITIAL,
  STATE_PARSING_COMPLETED,
  STATE_PARSING_STARTED,
  TYPE_CJS,
  TYPE_ESM,
  TYPE_JSON,
  TYPE_WASM
} = ENTRY

const {
  DEVELOPMENT,
  ELECTRON_RENDERER,
  FLAGS,
  NDB
} = ENV

const {
  ILLEGAL_AWAIT_IN_NON_ASYNC_FUNCTION
} = MESSAGE

const {
  MODE_ALL,
  MODE_AUTO
} = PACKAGE

const dummyParser = { input: "" }
const exportsRegExp = /^.*?\bexports\b/

function compile(caller, entry, content, filename, fallback) {
  const ext = entry.extname
  const mod = entry.module
  const pkg = entry.package
  const { options } = pkg
  const pkgMode = options.mode

  let hint = -1
  let isJSON = false
  let isWASM = false
  let sourceType = SOURCE_TYPE_SCRIPT

  if (ext === ".cjs") {
    hint = SOURCE_TYPE_SCRIPT
  } else if (ext === ".json") {
    hint = SOURCE_TYPE_JSON
    isJSON = true
  } else if (ext === ".mjs") {
    hint = SOURCE_TYPE_MODULE
  } else if (ext === ".wasm") {
    hint = SOURCE_TYPE_WASM
    isWASM = true
  }

  if (pkgMode === MODE_ALL) {
    sourceType = SOURCE_TYPE_MODULE
  } else if (pkgMode === MODE_AUTO) {
    sourceType = SOURCE_TYPE_UNAMBIGUOUS
  }

  const defaultPkg = Loader.state.package.default
  const isDefaultPkg = pkg === defaultPkg
  const isMJS = entry.extname === ".mjs"

  let { compileData } = entry

  if (compileData === null) {
    const { cacheName } = entry

    compileData = CachingCompiler.from(entry)

    if (compileData === null ||
        compileData.transforms !== 0) {
      if (isJSON ||
          isWASM) {
        entry.type = isJSON
          ? TYPE_JSON
          : TYPE_WASM

        compileData = {
          circular: 0,
          code: null,
          codeWithTDZ: null,
          filename: null,
          firstAwaitOutsideFunction: null,
          firstReturnOutsideFunction: null,
          mtime: -1,
          scriptData: null,
          sourceType: hint,
          transforms: 0,
          yieldIndex: -1
        }
      } else {
        const { cjs } = options

        const cjsPaths =
          cjs.paths &&
          ! isMJS

        const cjsVars =
          cjs.vars &&
          ! isMJS

        const scriptData = compileData === null
          ? null
          : compileData.scriptData

        const topLevelReturn =
          cjs.topLevelReturn &&
          ! isMJS

        compileData = tryCompile(caller, entry, content, {
          cacheName,
          cachePath: pkg.cachePath,
          cjsPaths,
          cjsVars,
          filename,
          hint,
          mtime: entry.mtime,
          runtimeName: entry.runtimeName,
          sourceType,
          topLevelReturn
        })

        compileData.scriptData = scriptData

        if (compileData.sourceType === SOURCE_TYPE_MODULE) {
          entry.type = TYPE_ESM
        }

        if (isDefaultPkg &&
            entry.type === TYPE_CJS &&
            compileData.transforms === TRANSFORMS_EVAL) {
          // Under the default package configuration, discard changes for CJS
          // modules with only `eval()` transformations.
          compileData.code = content
          compileData.transforms = 0
        }
      }

      entry.compileData = compileData
      pkg.cache.compile.set(cacheName, compileData)
    }
  }

  if (compileData !== null &&
      compileData.code === null) {
    compileData.code = content
  }

  const isESM = entry.type === TYPE_ESM

  let useFallback = false

  if (! isESM &&
      ! isWASM &&
      typeof fallback === "function") {
    const parentEntry = Entry.get(entry.parent)
    const parentIsESM = parentEntry === null ? false : parentEntry.type === TYPE_ESM
    const parentPkg = parentEntry === null ? null : parentEntry.package

    if (! parentIsESM &&
        (isDefaultPkg ||
         parentPkg === defaultPkg)) {
      useFallback = true
    }
  }

  if (useFallback) {
    entry.type = TYPE_CJS

    const frames = getStackFrames(constructError(Error, emptyArray))

    for (const frame of frames) {
      const framePath = frame.getFileName()

      if (isAbsolute(framePath) &&
          ! isOwnPath(framePath)) {
        return fallback(content)
      }
    }

    return tryRun(entry, filename, fallback)
  }

  const { moduleState } = shared

  let isSideloaded = false

  if (! moduleState.parsing) {
    if ((isESM ||
         isJSON ||
         isWASM) &&
        entry.state === STATE_INITIAL) {
      isSideloaded = true
      moduleState.parsing = true
      entry.state = STATE_PARSING_STARTED
    } else {
      return tryRun(entry, filename, fallback)
    }
  }

  if (isESM ||
      isJSON ||
      isWASM) {
    try {
      let result = tryRun(entry, filename, fallback)

      if (compileData.circular === -1) {
        compileData.circular = isDescendant(entry, entry) ? 1 : 0
      }

      if (compileData.circular === 1) {
        entry.circular = true

        if (isESM) {
          entry.runtime = null
          mod.exports = GenericObject.create()

          const { codeWithTDZ } = compileData

          if (codeWithTDZ !== null) {
            compileData.code = codeWithTDZ
          }

          result = tryRun(entry, filename, fallback)
        }
      }

      entry.updateBindings()

      if (entry._namespaceFinalized !== NAMESPACE_FINALIZATION_DEFERRED) {
        entry.finalizeNamespace()
      }

      if (! isSideloaded) {
        return result
      }
    } finally {
      if (isSideloaded) {
        moduleState.parsing = false
      }
    }
  }

  return tryRun(entry, filename, fallback)
}

function isDescendant(entry, parentEntry, seen) {
  if (seen === void 0) {
    seen = new Set
  } else if (seen.has(parentEntry)) {
    return false
  }

  seen.add(parentEntry)

  const { children } = parentEntry

  for (const name in children) {
    const childEntry = children[name]

    if (entry === childEntry ||
        isDescendant(entry, childEntry, seen)) {
      return true
    }
  }

  return false
}

function tryCompile(caller, entry, content, options) {
  let error

  try {
    return CachingCompiler.compile(content, options)
  } catch (e) {
    error = e
  }

  entry.state = STATE_INITIAL

  if (! Loader.state.package.default.options.debug &&
      isStackTraceMaskable(error)) {
    captureStackTrace(error, caller)

    maskStackTrace(error, {
      content,
      filename: options.filename
    })
  } else {
    toExternalError(error)
  }

  throw error
}

function tryRun(entry, filename, fallback) {
  const { compileData, type } = entry
  const isESM = type === TYPE_ESM
  const isJSON = type === TYPE_JSON
  const isMJS = entry.extname === ".mjs"
  const isWASM = type === TYPE_WASM

  let { runtime } = entry

  if (runtime === null) {
    if (isESM ||
        compileData.transforms !== 0) {
      runtime = Runtime.enable(entry, GenericObject.create())
    } else {
      runtime = GenericObject.create()
      entry.runtime = runtime
    }
  }

  const pkg = entry.package
  const async = useAsync(entry)
  const { cjs } = pkg.options
  const firstPass = runtime.runResult === void 0
  const mod = entry.module
  const { parsing } = shared.moduleState

  let error
  let result
  let threw = false

  entry.state = parsing
    ? STATE_PARSING_STARTED
    : STATE_EXECUTION_STARTED

  if (firstPass) {
    entry.running = true

    if (isJSON)  {
      runtime.runResult = (function *() {
        const parsed = jsonParse(entry, filename, fallback)
        yield
        jsonEvaluate(entry, parsed)
      })()
    } else if (isWASM) {
      runtime.runResult = (function *() {
        // Use a `null` [[Prototype]] for `importObject` because the lookup
        // includes inherited properties.
        const importObject = { __proto__: null }
        const wasmMod = wasmParse(entry, filename, importObject)
        yield
        wasmEvaluate(entry, wasmMod, importObject)
      })()
    } else {
      const cjsVars =
        cjs.vars &&
        ! isMJS

      const source = compileSource(compileData, {
        async,
        cjsVars,
        runtimeName: entry.runtimeName,
        sourceMap: useSourceMap(entry)
      })

      if (isESM) {
        try {
          if (entry._ranthruCompile) {
            result = Reflect.apply(protoCompile, mod, [source, filename])
          } else {
            entry._ranthruCompile = true
            result = mod._compile(source, filename)
          }
        } catch (e) {
          threw = true
          error = e
        }
      } else {
        const { _compile } = mod

        runtime.runResult = (function *() {
          yield

          // Avoid V8 tail call optimization bug with --harmony flag in Node 6.
          // https://bugs.chromium.org/p/v8/issues/detail?id=5322
          return result = Reflect.apply(_compile, mod, [source, filename])
        })()
      }
    }

    entry.running = false
  }

  const { runResult } = runtime

  if (! threw &&
      ! parsing &&
      firstPass) {
    entry.running = true

    try {
      runResult.next()
    } catch (e) {
      threw = true
      error = e
    }

    entry.running = false
  }

  const { firstAwaitOutsideFunction } = compileData

  const inModule =
    (! cjs.paths ||
     isMJS) &&
    entry.type !== TYPE_CJS

  if (! threw &&
      ! entry.running &&
      async &&
      isESM &&
      firstAwaitOutsideFunction !== null &&
      ! isObjectEmpty(entry.getters)) {
    threw = true
    error = new errors.SyntaxError(dummyParser, ILLEGAL_AWAIT_IN_NON_ASYNC_FUNCTION)
    error.column = firstAwaitOutsideFunction.column
    error.inModule = inModule
    error.line = firstAwaitOutsideFunction.line
  }

  if (! threw &&
      ! entry.running) {
    entry.running = true

    try {
      result = runResult.next().value
    } catch (e) {
      threw = true
      error = e
    }

    entry.running = false
  }

  if (! threw) {
    if (isESM ||
        isWASM) {
      Reflect.defineProperty(mod, "loaded", {
        configurable: true,
        enumerable: true,
        get: toExternalFunction(() => false),
        set: toExternalFunction(function (value) {
          if (value) {
            setProperty(this, "loaded", value)
            entry.updateBindings()
            entry.loaded()
          }
        })
      })
    }

    entry.state = parsing
      ? STATE_PARSING_COMPLETED
      : STATE_EXECUTION_COMPLETED

    return result
  }

  entry.state = STATE_INITIAL

  if (Loader.state.package.default.options.debug ||
      ! isStackTraceMaskable(error)) {
    toExternalError(error)

    throw error
  }

  const message = toString(get(error, "message"))
  const name = get(error, "name")

  if (isESM &&
      (name === "SyntaxError" ||
       (name === "ReferenceError" &&
        exportsRegExp.test(message)))) {
    pkg.cache.dirty = true
  }

  const loc = getLocationFromStackTrace(error)

  if (loc !== null) {
    filename = loc.filename
  }

  maskStackTrace(error, { filename, inModule })

  throw error
}

function useAsync(entry) {
  return entry.package.options.await &&
    shared.support.await &&
    entry.extname !== ".mjs"
}

function useSourceMap(entry) {
  const { sourceMap } = entry.package.options

  return sourceMap !== false &&
    (sourceMap ||
     DEVELOPMENT ||
     ELECTRON_RENDERER ||
     NDB ||
     FLAGS.inspect) &&
    getSourceMappingURL(entry.compileData.code) === ""
}

function jsonEvaluate(entry, parsed) {
  entry.exports = parsed
  entry.module.exports = parsed

  const { getters } = entry

  for (const name in getters) {
    entry.addGetter(name, () => entry.exports[name])
  }

  entry.addGetter("default", () => entry.exports)
}

function jsonParse(entry, filename, fallback) {
  const mod = entry.module
  const exported = mod.exports
  const { state } = entry

  let useFallback = false

  if (typeof fallback === "function") {
    const parentEntry = Entry.get(entry.parent)

    useFallback =
      parentEntry !== null &&
      parentEntry.package.options.cjs.extensions &&
      parentEntry.extname !== ".mjs"
  }

  const content = useFallback
    ? null
    : stripBOM(readFile(filename, "utf8"))

  let error
  let parsed
  let threw = true

  try {
    if (useFallback) {
      fallback()
      parsed = mod.exports
    } else {
      parsed = SafeJSON.parse(content)
    }

    threw = false
  } catch (e) {
    error = e

    if (! useFallback) {
      error.message = filename + ": " + error.message
    }
  }

  if (useFallback) {
    entry.state = state
    setProperty(mod, "exports", exported)
  }

  if (threw) {
    throw error
  }

  const names = keys(parsed)

  for (const name of names) {
    if (isIdentifierName(name)) {
      entry.addGetter(name, () => ERROR_GETTER)
    }
  }

  entry.addGetter("default", () => ERROR_GETTER)

  return parsed
}

function wasmEvaluate(entry, wasmMod, importObject) {
  entry.resumeChildren()

  const { children } = entry

  for (const request in importObject) {
    const name = importObject[request]

    importObject[request] = children[name].module.exports
  }

  const exported = entry.module.exports
  const { getters } = entry
  const wasmInstance = new WebAssembly.Instance(wasmMod, importObject)
  const wasmExported = assign(GenericObject.create(), wasmInstance.exports)

  entry.exports = wasmExported

  for (const name in wasmExported) {
    const getter = () => entry.exports[name]

    if (has(getters, name)) {
      entry.addGetter(name, getter)
    }

    Reflect.defineProperty(exported, name, {
      configurable: true,
      enumerable: true,
      get: toExternalFunction(getter),
      set: toExternalFunction(function (value) {
        setProperty(this, name, value)
      })
    })
  }
}

function wasmParse(entry, filename, importObject) {
  const wasmMod = new WebAssembly.Module(readFile(filename))
  const exportDescriptions = WebAssembly.Module.exports(wasmMod)
  const importDescriptions = WebAssembly.Module.imports(wasmMod)

  for (const { name } of exportDescriptions) {
    if (isIdentifierName(name)) {
      entry.addGetter(name, () => ERROR_GETTER)
    }
  }

  for (const { module:request, name } of importDescriptions) {
    esmImport(request, entry, [[name, [name], (value, childEntry) => {
      importObject[request] = childEntry.name
    }]])
  }

  return wasmMod
}

export default compile
