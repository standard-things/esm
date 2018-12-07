import COMPILER from "../../constant/compiler.js"
import ENTRY from "../../constant/entry.js"
import ENV from "../../constant/env.js"
import PACKAGE from "../../constant/package.js"

import Compiler from "../../caching-compiler.js"
import GenericObject from "../../generic/object.js"
import Loader from "../../loader.js"
import Runtime from "../../runtime.js"

import captureStackTrace from "../../error/capture-stack-trace.js"
import compileSource from "./compile-source.js"
import esmValidate from "../esm/validate.js"
import get from "../../util/get.js"
import getLocationFromStackTrace from "../../error/get-location-from-stack-trace.js"
import getSourceMappingURL from "../../util/get-source-mapping-url.js"
import getStackFrames from "../../error/get-stack-frames.js"
import isAbsolute from "../../path/is-absolute.js"
import isObjectEmpty from "../../util/is-object-empty.js"
import isOwnPath from "../../util/is-own-path.js"
import isError from "../../util/is-error.js"
import isStackTraceMasked from "../../util/is-stack-trace-masked.js"
import maskStackTrace from "../../error/mask-stack-trace.js"
import shared from "../../shared.js"
import toString from "../../util/to-string.js"

const {
  SOURCE_TYPE_MODULE,
  SOURCE_TYPE_SCRIPT,
  SOURCE_TYPE_UNAMBIGUOUS
} = COMPILER

const {
  STATE_EXECUTION_COMPLETED,
  STATE_EXECUTION_STARTED,
  TYPE_CJS,
  TYPE_ESM
} = ENTRY

const {
  DEVELOPMENT,
  ELECTRON_RENDERER,
  FLAGS,
  NDB
} = ENV

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
    compileData = Compiler.from(entry)

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

      entry.type = compileData.sourceType === SOURCE_TYPE_MODULE
        ? TYPE_ESM
        : TYPE_CJS

      compileData.scriptData = scriptData

      entry.compileData =
      pkg.cache.compile[cacheName] = compileData
    } else {
      compileData.code = content
    }
  }

  if (parsing) {
    if (entry.type === TYPE_ESM) {
      tryValidate(caller, entry, content, filename)
      entry.initNamespace()
    } else if (typeof fallback === "function") {
      const defaultPkg = Loader.state.package.default
      const { mainModule } = Loader.state.module
      const parentEntry = entry.parent
      const parentIsESM = parentEntry === null ? false : parentEntry.type === TYPE_ESM
      const parentPkg = parentEntry === null ? null : parentEntry.package

      if (! parentIsESM &&
          entry.module !== mainModule &&
          (pkg === defaultPkg ||
           parentPkg === defaultPkg)) {
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
  } else {
    return tryCompileCached(entry, filename)
  }
}

function tryCompileCached(entry, filename) {
  const { compileData } = entry
  const isESM = compileData.sourceType === SOURCE_TYPE_MODULE
  const mod = entry.module

  const cjsVars =
    entry.package.options.cjs.vars &&
    entry.extname !== ".mjs"

  let error
  let result

  try {
    const async = useAsync(entry)

    const source = compileSource(compileData, {
      async,
      cjsVars,
      runtimeName: entry.runtimeName,
      sourceMap: useSourceMap(entry)
    })

    if (isESM ||
        compileData.changed) {
      const runtime = Runtime.enable(entry, GenericObject.create())

      if (isESM &&
          ! async) {
        entry.state = STATE_EXECUTION_STARTED
        mod._compile(source, filename)

        // Debuggers may wrap `Module#_compile()` with
        // `process.binding("inspector").callAndPauseOnStart()`
        // and not forward the return value.
        const { _runResult } = runtime

        // Eventually, we will call this in the instantiate phase.
        _runResult.next()

        result = _runResult.next().value
        entry.state = STATE_EXECUTION_COMPLETED
      }
    }

    if (entry.state < STATE_EXECUTION_STARTED) {
      entry.state = STATE_EXECUTION_STARTED
      result = mod._compile(source, filename)
      entry.state = STATE_EXECUTION_COMPLETED
    }

    return result
  } catch (e) {
    error = e
  }

  if (Loader.state.package.default.options.debug ||
      ! isError(error) ||
      isStackTraceMasked(error)) {
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

  throw maskStackTrace(error, {
    filename,
    inModule: isESM
  })
}

function tryCompileCode(caller, content, options) {
  let error

  try {
    return Compiler.compile(content, options)
  } catch (e) {
    error = e
  }

  if (Loader.state.package.default.options.debug ||
      ! isError(error) ||
      isStackTraceMasked(error)) {
    throw error
  }

  captureStackTrace(error, caller)

  throw maskStackTrace(error, {
    content,
    filename: options.filename
  })
}

function tryValidate(caller, entry, content, filename) {
  let error

  try {
    esmValidate(entry)
    return
  } catch (e) {
    error = e
  }

  if (Loader.state.package.default.options.debug ||
      isStackTraceMasked(error)) {
    throw error
  }

  captureStackTrace(error, caller)

  const loc = getLocationFromStackTrace(error)

  if (loc !== null &&
      loc.filename !== filename) {
    content = null
    filename = loc.filename
  }

  throw maskStackTrace(error, {
    content,
    filename,
    inModule: true
  })
}

function useAsync(entry) {
  return entry.package.options.await &&
    shared.support.await &&
    entry.extname !== ".mjs" &&
    isObjectEmpty(entry.compileData.exportedSpecifiers)
}

function useSourceMap(entry) {
  const { sourceMap } = entry.package.options

  return sourceMap !== false &&
    (sourceMap ||
     DEVELOPMENT ||
     ELECTRON_RENDERER ||
     NDB ||
     FLAGS.inspect) &&
    ! getSourceMappingURL(entry.compileData.code)
}

export default compile
