import ENTRY from "../../constant/entry.js"
import ENV from "../../constant/env.js"
import PACKAGE from "../../constant/package.js"
import SOURCE_TYPE from "../../constant/source-type.js"

import Compiler from "../../caching-compiler.js"
import GenericObject from "../../generic/object.js"
import Package from "../../package.js"
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
import readFile from "../../fs/read-file.js"
import shared from "../../shared.js"
import toString from "../../util/to-string.js"

const {
  STATE_EXECUTION_STARTED,
  STATE_PARSING_STARTED,
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
  OPTIONS_MODE_ALL,
  OPTIONS_MODE_AUTO
} = PACKAGE

const {
  MODULE,
  SCRIPT,
  UNAMBIGUOUS
} = SOURCE_TYPE

const exportsRegExp = /^.*?\bexports\b/

function compile(caller, entry, content, filename, fallback) {
  const pkg = entry.package
  const { options } = pkg
  const { mode } = options
  const { parsing } = shared.moduleState

  let hint = SCRIPT
  let sourceType = SCRIPT

  if (entry.extname === ".mjs") {
    hint = MODULE
    sourceType = MODULE
  } else if (mode === OPTIONS_MODE_ALL) {
    sourceType = MODULE
  } else if (mode === OPTIONS_MODE_AUTO) {
    sourceType = UNAMBIGUOUS
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

      entry.type = compileData.sourceType === MODULE
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
      if (entry.state === STATE_PARSING_STARTED) {
        tryValidate(caller, entry, content, filename)
        entry.initNamespace()
      }
    } else if (fallback) {
      const defaultPkg = Package.state.default
      const parentEntry = entry.parent
      const parentIsESM = parentEntry && parentEntry.type === TYPE_ESM
      const parentPkg = parentEntry && parentEntry.package

      if (! parentIsESM &&
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
  const isESM = compileData.sourceType === MODULE
  const mod = entry.module

  const cjsVars =
    entry.package.options.cjs.vars &&
    entry.extname !== ".mjs"

  let error
  let result
  let threw = false

  entry.state = STATE_EXECUTION_STARTED

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

      result = mod._compile(source, filename)

      if (isESM &&
          ! async) {
        // Debuggers may wrap `Module#_compile()` with
        // `process.binding("inspector").callAndPauseOnStart()`
        // and not forward the return value.
        const { _runResult } = runtime

        // Eventually, we will call this in the instantiate phase.
        _runResult.next()

        result = _runResult.next().value
      }
    } else {
      result = mod._compile(source, filename)
    }
  } catch (e) {
    error = e
    threw = true
  }

  if (! threw) {
    return result
  }

  if (Package.state.default.options.debug ||
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

  if (loc) {
    filename = loc.filename
  }

  const content = () => readFile(filename, "utf8")

  throw maskStackTrace(error, content, filename, isESM)
}

function tryCompileCode(caller, content, options) {
  let error

  try {
    return Compiler.compile(content, options)
  } catch (e) {
    error = e
  }

  if (Package.state.default.options.debug ||
      ! isError(error) ||
      isStackTraceMasked(error)) {
    throw error
  }

  const isESM = error.sourceType === MODULE

  Reflect.deleteProperty(error, "sourceType")
  captureStackTrace(error, caller)
  throw maskStackTrace(error, content, options.filename, isESM)
}

function tryValidate(caller, entry, content, filename) {
  let error

  try {
    return esmValidate(entry)
  } catch (e) {
    error = e
  }

  if (Package.state.default.options.debug ||
      isStackTraceMasked(error)) {
    throw error
  }

  captureStackTrace(error, caller)

  const loc = getLocationFromStackTrace(error)

  if (loc &&
      loc.filename !== filename) {
    filename = loc.filename
    content = () => readFile(filename, "utf8")
  }

  throw maskStackTrace(error, content, filename, true)
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
