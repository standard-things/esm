import COMPILER from "../../constant/compiler.js"
import ENTRY from "../../constant/entry.js"
import ENV from "../../constant/env.js"
import MESSAGE from "../../constant/message.js"
import PACKAGE from "../../constant/package.js"

import CachingCompiler from "../../caching-compiler.js"
import GenericObject from "../../generic/object.js"
import Loader from "../../loader.js"
import Runtime from "../../runtime.js"

import captureStackTrace from "../../error/capture-stack-trace.js"
import compileSource from "./compile-source.js"
import errors from "../../parse/errors.js"
import get from "../../util/get.js"
import getLocationFromStackTrace from "../../error/get-location-from-stack-trace.js"
import getSourceMappingURL from "../../util/get-source-mapping-url.js"
import getStackFrames from "../../error/get-stack-frames.js"
import isAbsolute from "../../path/is-absolute.js"
import isObjectEmpty from "../../util/is-object-empty.js"
import isOwnPath from "../../util/is-own-path.js"
import isStackTraceMaskable from "../../util/is-stack-trace-maskable.js"
import maskStackTrace from "../../error/mask-stack-trace.js"
import setProperty from "../../util/set-property.js"
import shared from "../../shared.js"
import toExternalError from "../../util/to-external-error.js"
import toString from "../../util/to-string.js"

const {
  SOURCE_TYPE_MODULE,
  SOURCE_TYPE_SCRIPT,
  SOURCE_TYPE_UNAMBIGUOUS
} = COMPILER

const {
  STATE_EXECUTION_COMPLETED,
  STATE_EXECUTION_STARTED,
  STATE_PARSING_COMPLETED,
  STATE_PARSING_STARTED,
  TYPE_ESM
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

const exportsRegExp = /^.*?\bexports\b/

function compile(caller, entry, content, filename, fallback) {
  const pkg = entry.package
  const { options } = pkg
  const { mode } = options
  const { parsing } = shared.moduleState

  let hint = SOURCE_TYPE_SCRIPT
  let sourceType = SOURCE_TYPE_SCRIPT

  if (entry.extname === ".mjs") {
    hint = SOURCE_TYPE_MODULE
    sourceType = SOURCE_TYPE_MODULE
  } else if (mode === MODE_ALL) {
    sourceType = SOURCE_TYPE_MODULE
  } else if (mode === MODE_AUTO) {
    sourceType = SOURCE_TYPE_UNAMBIGUOUS
  }

  let { compileData } = entry

  if (compileData === null) {
    compileData = CachingCompiler.from(entry)

    if (compileData === null ||
        compileData.changed) {
      const { cacheName } = entry
      const { cjs } = options

      const scriptData = compileData
        ? compileData.scriptData
        : null

      compileData = tryCompileCode(caller, content, {
        cacheName,
        cachePath: pkg.cachePath,
        cjsVars: cjs.vars,
        filename,
        hint,
        mtime: entry.mtime,
        runtimeName: entry.runtimeName,
        sourceType,
        topLevelReturn: cjs.topLevelReturn
      })

      compileData.scriptData = scriptData

      if (compileData.sourceType === SOURCE_TYPE_MODULE) {
        entry.type = TYPE_ESM
      }

      entry.compileData = compileData
      pkg.cache.compile[cacheName] = compileData
    }
  }

  if (compileData !== null &&
      compileData.code === null) {
    compileData.code = content
    compileData.codeWithoutTDZ = content
  }

  if (parsing) {
    if (entry.type === TYPE_ESM) {
      const result = tryCompileCached(entry, filename)

      if (compileData.circular === -1) {
        compileData.circular = isDescendant(entry, entry) ? 1 : 0
      }

      if (compileData.circular === 1) {
        entry.circular = true
      } else {
        compileData.code = compileData.codeWithoutTDZ
      }

      entry.updateBindings()
      entry.finalizeNamespace()

      return result
    }

    if (typeof fallback === "function") {
      const defaultPkg = Loader.state.package.default
      const parentEntry = entry.parent
      const parentIsESM = parentEntry === null ? false : parentEntry.type === TYPE_ESM
      const parentPkg = parentEntry === null ? null : parentEntry.package

      if (! parentIsESM &&
          (pkg === defaultPkg ||
           parentPkg === defaultPkg) &&
          entry.module !== Loader.state.module.mainModule) {
        const frames = getStackFrames(new Error)

        for (const frame of frames) {
          const framePath = frame.getFileName()

          if (isAbsolute(framePath) &&
              ! isOwnPath(framePath)) {
            return fallback()
          }
        }
      }
    }
  }

  return tryCompileCached(entry, filename)
}

function isDescendant(entry, parentEntry, seen) {
  if (entry.builtin ||
      entry.type !== TYPE_ESM) {
    return false
  }

  const parentName = parentEntry.name

  if (seen !== void 0 &&
      seen.has(parentName)) {
    return false
  } else if (seen === void 0) {
    seen = new Set
  }

  seen.add(parentName)

  const { children } = parentEntry
  const { name } = entry

  for (const childName in children) {
    if (childName === name ||
        isDescendant(entry, children[childName], seen)) {
      return true
    }
  }

  return false
}

function tryCompileCached(entry, filename) {
  const { parsing } = shared.moduleState
  const async = useAsync(entry)
  const { compileData } = entry
  const isESM = entry.type === TYPE_ESM
  const mod = entry.module

  const cjsVars =
    entry.package.options.cjs.vars &&
    entry.extname !== ".mjs"

  let { runtime } = entry

  if (isESM ||
      compileData.changed) {
    runtime = Runtime.enable(entry, GenericObject.create())
  } else if (runtime === null) {
    runtime = entry.runtime = {}
  }

  let error
  let result
  let threw = false

  entry.state = parsing
    ? STATE_PARSING_STARTED
    : STATE_EXECUTION_STARTED

  const firstPass = runtime._runResult === void 0

  if (firstPass) {
    const source = compileSource(compileData, {
      async,
      cjsVars,
      runtimeName: entry.runtimeName,
      sourceMap: useSourceMap(entry)
    })

    entry.running = true

    try {
      if (isESM) {
        result = mod._compile(source, filename)
      } else {
        const { _compile } = mod

        runtime._runResult = (function *() {
          yield
          return Reflect.apply(_compile, mod, [source, filename])
        })()
      }
    } catch (e) {
      threw = true
      error = e
    }

    entry.running = false
  }

  // Debuggers may wrap `Module#_compile()` with
  // `process.binding("inspector").callAndPauseOnStart()`
  // and not forward the return value.
  const { _runResult } = runtime

  if (! threw &&
      ! parsing &&
      firstPass) {
    entry.running = true

    try {
      _runResult.next()
    } catch (e) {
      threw = true
      error = e
    }

    entry.running = false
  }

  if (! threw &&
      ! entry.running) {
    const { firstAwaitOutsideFunction } = compileData

    entry.running = true

    try {
      if (async &&
          isESM &&
          firstAwaitOutsideFunction !== null &&
          ! isObjectEmpty(entry._namespace)) {
        const error = new errors.SyntaxError({
          input: ""
        }, ILLEGAL_AWAIT_IN_NON_ASYNC_FUNCTION)

        error.inModule = true
        error.column = firstAwaitOutsideFunction.column
        error.line = firstAwaitOutsideFunction.line

        throw error
      }

      result = _runResult.next().value
    } catch (e) {
      threw = true
      error = e
    }

    entry.running = false
  }

  if (! threw) {
    entry.state = parsing
      ? STATE_PARSING_COMPLETED
      : STATE_EXECUTION_COMPLETED

    if (isESM) {
      Reflect.defineProperty(mod, "loaded", {
        configurable: true,
        enumerable: true,
        get: () => false,
        set(value) {
          if (value) {
            setProperty(this, "loaded", value)
            entry.updateBindings()
            entry.loaded()
          }
        }
      })
    } else if (! parsing &&
        firstPass) {
      entry.module.loaded = true
      entry.loaded()
      entry.updateBindings()
    }

    return result
  }

  if (Loader.state.package.default.options.debug ||
      ! isStackTraceMaskable(error)) {
    throw error
  }

  const message = toString(get(error, "message"))
  const name = get(error, "name")

  if (isESM &&
      (name === "SyntaxError" ||
       (name === "ReferenceError" &&
        exportsRegExp.test(message)))) {
    entry.package.cache.dirty = true
  }

  const loc = getLocationFromStackTrace(error)

  if (loc !== null) {
    filename = loc.filename
  }

  maskStackTrace(error, { filename, inModule: isESM })

  throw error
}

function tryCompileCode(caller, content, options) {
  let error

  try {
    return CachingCompiler.compile(content, options)
  } catch (e) {
    error = e
  }

  if (Loader.state.package.default.options.debug ||
      ! isStackTraceMaskable(error)) {
    toExternalError(error)
  } else {
    captureStackTrace(error, caller)
    maskStackTrace(error, { content, filename: options.filename })
  }

  throw error
}

function useAsync(entry) {
  return entry.package.options.await &&
    shared.support.await &&
    entry.extname !== ".mjs"
}

function useSourceMap(entry) {
  if (DEVELOPMENT ||
      ELECTRON_RENDERER ||
      NDB ||
      FLAGS.inspect ||
      entry.package.options.sourceMap) {
    return getSourceMappingURL(entry.compileData.code) === ""
  }

  return false
}

export default compile
