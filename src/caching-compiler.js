import {
  getMaxListeners,
  once,
  setMaxListeners
} from "./safe/process.js"

import { sep, resolve } from "./safe/path.js"

import COMPILER from "./constant/compiler.js"
import ENTRY from "./constant/entry.js"
import ESM from "./constant/esm.js"

import Compiler from "./compiler.js"
import GenericBuffer from "./generic/buffer.js"

import exists from "./fs/exists.js"
import getCachePathHash from "./util/get-cache-path-hash.js"
import isExtMJS from "./path/is-ext-mjs.js"
import getEnv from "./util/get-env.js"
import mkdirp from "./fs/mkdirp.js"
import parseJSON from "./util/parse-json.js"
import relative from "./path/relative.js"
import removeFile from "./fs/remove-file.js"
import shared from "./shared.js"
import toExternalFunction from "./util/to-external-function.js"
import writeFile from "./fs/write-file.js"

function init() {
  const {
    SOURCE_TYPE_MODULE,
    SOURCE_TYPE_SCRIPT
  } = COMPILER

  const {
    TYPE_ESM
  } = ENTRY

  const {
    PACKAGE_VERSION
  } = ESM

  const CachingCompiler = {
    compile(code, options = {}) {
      if (! options.eval &&
          options.filename &&
          options.cachePath) {
        return compileAndWrite(code, options)
      }

      return compile(code, options)
    },
    from(entry) {
      const pkg = entry.package
      const { cache } = pkg
      const { cacheName } = entry
      const meta = cache.meta.get(cacheName)

      if (meta === void 0) {
        return null
      }

      const { length } = meta

      const result = {
        circular: 0,
        code: null,
        codeWithTDZ: null,
        filename: null,
        firstAwaitOutsideFunction: null,
        firstReturnOutsideFunction: null,
        mtime: -1,
        scriptData: null,
        sourceType: SOURCE_TYPE_SCRIPT,
        transforms: 0,
        yieldIndex: -1
      }

      if (length > 2) {
        const filename = meta[7]

        if (typeof filename === "string") {
          result.filename = resolve(pkg.cachePath, filename)
        }

        const deflatedFirstAwaitOutsideFunction = meta[5]

        if (deflatedFirstAwaitOutsideFunction !== null) {
          result.firstAwaitOutsideFunction = inflateLineInfo(deflatedFirstAwaitOutsideFunction)
        }

        const deflatedFirstReturnOutsideFunction = meta[6]

        if (deflatedFirstReturnOutsideFunction !== null) {
          result.firstReturnOutsideFunction = inflateLineInfo(deflatedFirstReturnOutsideFunction)
        }

        result.mtime = +meta[3]
        result.sourceType = +meta[4]
        result.transforms = +meta[2]
      }

      if (length > 7 &&
          result.sourceType === SOURCE_TYPE_MODULE) {
        entry.type = TYPE_ESM
        result.circular = +meta[8]
        result.yieldIndex = +meta[9]
      }

      const [offsetStart, offsetEnd] = meta

      if (offsetStart !== -1 &&
          offsetEnd !== -1) {
        result.scriptData = GenericBuffer.slice(cache.buffer, offsetStart, offsetEnd)
      }

      entry.compileData = result
      cache.compile.set(cacheName, result)

      return result
    }
  }

  function compile(code, options) {
    const result = Compiler.compile(code, toCompileOptions(options))

    if (options.eval) {
      return result
    }

    result.filename = options.filename
    result.mtime = options.mtime

    return result
  }

  function compileAndWrite(code, options) {
    const { cacheName, cachePath } = options
    const result = compile(code, options)

    if (! cacheName ||
        ! cachePath ||
        result.transforms === 0) {
      return result
    }

    const { pendingWrites } = shared

    let compileDatas = pendingWrites.get(cachePath)

    if (compileDatas === void 0) {
      compileDatas = new Map
      pendingWrites.set(cachePath, compileDatas)
    }

    compileDatas.set(cacheName, result)

    return result
  }

  function deflateLineInfo({ column, line }) {
    return [column, line]
  }

  function inflateLineInfo([column, line]) {
    return { column, line }
  }

  function onExit() {
    setMaxListeners(Math.max(getMaxListeners() - 1, 0))

    const { pendingScripts, pendingWrites } = shared
    const { dir } = shared.package

    dir.forEach((cache, cachePath) => {
      if (cachePath === "") {
        return
      }

      const noCacheDir = ! mkdirp(cachePath)

      let { dirty } = cache

      if (! dirty &&
          ! noCacheDir) {
        dirty = !! parseJSON(getEnv("ESM_DISABLE_CACHE"))
        cache.dirty = dirty
      }

      if (dirty ||
          noCacheDir) {
        dir.delete(cachePath)
        pendingScripts.delete(cachePath)
        pendingWrites.delete(cachePath)
      }

      if (noCacheDir) {
        return
      }

      if (dirty) {
        writeMarker(cachePath + sep + ".dirty")
        removeFile(cachePath + sep + ".data.blob")
        removeFile(cachePath + sep + ".data.json")

        cache.compile.forEach((compileData, cacheName) => {
          removeFile(cachePath + sep + cacheName)
        })
      }
    })

    const pendingScriptDatas = new Map
    const useCreateCachedData = shared.support.createCachedData

    pendingScripts.forEach((scripts, cachePath) => {
      const cache = dir.get(cachePath)
      const compileDatas = cache.compile
      const metas = cache.meta

      scripts.forEach((script, cacheName) => {
        let compileData = compileDatas.get(cacheName)

        if (compileData === void 0) {
          compileData = null
        }

        let cachedData

        if (compileData !== null) {
          cachedData = compileData.scriptData

          if (cachedData === null) {
            cachedData = void 0
          }
        }

        let changed = false
        let scriptData = null

        if (cachedData === void 0) {
          if (useCreateCachedData &&
              typeof script.createCachedData === "function") {
            scriptData = script.createCachedData()
          } else if (script.cachedDataProduced) {
            scriptData = script.cachedData
          }
        }

        if (scriptData !== null &&
            scriptData.length) {
          changed = true
        }

        if (compileData !== null) {
          if (scriptData !== null) {
            compileData.scriptData = scriptData
          } else if (cachedData !== void 0 &&
                     script.cachedDataRejected) {
            changed = true

            const meta = metas.get(cacheName)

            if (meta !== void 0) {
              meta[0] = -1
              meta[1] = -1
            }

            scriptData = null
            compileData.scriptData = null
          }
        }

        if (changed &&
            cacheName !== "") {
          let scriptDatas = pendingScriptDatas.get(cachePath)

          if (scriptDatas === void 0) {
            scriptDatas = new Map
            pendingScriptDatas.set(cachePath, scriptDatas)
          }

          scriptDatas.set(cacheName, scriptData)
        }
      })
    })

    pendingScriptDatas.forEach((scriptDatas, cachePath) => {
      const cache = dir.get(cachePath)
      const compileDatas = cache.compile
      const metas = cache.meta

      scriptDatas.forEach((scriptData, cacheName) => {
        let meta = metas.get(cacheName)

        if (meta !== void 0) {
          return
        }

        meta = [-1, -1]

        let compileData = compileDatas.get(cacheName)

        if (compileData === void 0) {
          compileData = null
        }

        if (compileData !== null) {
          const {
            filename,
            firstAwaitOutsideFunction,
            firstReturnOutsideFunction,
            mtime,
            sourceType,
            transforms
          } = compileData

          const deflatedFirstAwaitOutsideFunction = firstAwaitOutsideFunction === null
            ? null
            : deflateLineInfo(firstAwaitOutsideFunction)

          const deflatedFirstReturnOutsideFunction = firstReturnOutsideFunction === null
            ? null
            : deflateLineInfo(firstReturnOutsideFunction)

          if (sourceType === SOURCE_TYPE_SCRIPT) {
            if (transforms !== 0) {
              meta.push(
                transforms,
                mtime,
                sourceType,
                deflatedFirstAwaitOutsideFunction,
                deflatedFirstReturnOutsideFunction,
                relative(cachePath, filename)
              )
            }
          } else {
            meta.push(
              transforms,
              mtime,
              sourceType,
              deflatedFirstAwaitOutsideFunction,
              deflatedFirstReturnOutsideFunction,
              relative(cachePath, filename),
              compileData.circular,
              compileData.yieldIndex
            )
          }
        }

        metas.set(cacheName, meta)
      })

      const { buffer } = cache
      const buffers = []
      const jsonMeta = {}

      let offset = 0

      metas.forEach((meta, cacheName) => {
        let scriptData = scriptDatas.get(cacheName)

        if (scriptData === void 0) {
          let compileData = compileDatas.get(cacheName)

          if (compileData === void 0) {
            compileData = null
          }

          const [offsetStart, offsetEnd] = meta

          scriptData = null

          if (compileData !== null) {
            scriptData = compileData.scriptData
          } else if (offsetStart !== -1 &&
                     offsetEnd !== -1) {
            scriptData = GenericBuffer.slice(buffer, offsetStart, offsetEnd)
          }
        }

        if (scriptData !== null) {
          meta[0] = offset
          offset += scriptData.length
          meta[1] = offset
          buffers.push(scriptData)
        }

        jsonMeta[cacheName] = meta
      })

      writeFile(cachePath + sep + ".data.blob", GenericBuffer.concat(buffers))
      writeFile(cachePath + sep + ".data.json", JSON.stringify({
        meta: jsonMeta,
        version: PACKAGE_VERSION
      }))
    })

    pendingWrites.forEach((compileDatas, cachePath) => {
      compileDatas.forEach((compileData, cacheName) => {
        if (writeFile(cachePath + sep + cacheName, compileData.code)) {
          removeExpired(cachePath, cacheName)
        }
      })
    })
  }

  function removeExpired(cachePath, cacheName) {
    const cache = shared.package.dir.get(cachePath)
    const compileDatas = cache.compile
    const metas = cache.meta
    const pathHash = getCachePathHash(cacheName)

    compileDatas.forEach((compileData, otherCacheName) => {
      if (otherCacheName !== cacheName &&
          otherCacheName.startsWith(pathHash)) {
        compileDatas.delete(otherCacheName)
        metas.delete(otherCacheName)
        removeFile(cachePath + sep + otherCacheName)
      }
    })
  }

  function toCompileOptions(options = {}) {
    let {
      cjsPaths,
      cjsVars,
      topLevelReturn
    } = options

    if (isExtMJS(options.filename)) {
      cjsPaths = void 0
      cjsVars = void 0
      topLevelReturn = void 0
    }

    const { runtimeName } = options

    if (options.eval) {
      // Set `topLevelReturn` to `true` so that the "Illegal return statement"
      // syntax error will occur within `eval()`.
      return {
        cjsPaths,
        cjsVars,
        runtimeName,
        topLevelReturn: true
      }
    }

    return {
      cjsPaths,
      cjsVars,
      generateVarDeclarations: options.generateVarDeclarations,
      hint: options.hint,
      pragmas: options.pragmas,
      runtimeName,
      sourceType: options.sourceType,
      strict: options.strict,
      topLevelReturn
    }
  }

  function writeMarker(filename) {
    if (! exists(filename)) {
      writeFile(filename, "")
    }
  }

  // Create cache in an "exit" event handler. "SIGINT" and "SIGTERM" events are
  // not safe to observe because handlers conflict with applications managing
  // "SIGINT" and "SIGTERM" themselves.
  setMaxListeners(getMaxListeners() + 1)
  once("exit", toExternalFunction(onExit))

  return CachingCompiler
}

export default shared.inited
  ? shared.module.CachingCompiler
  : shared.module.CachingCompiler = init()
