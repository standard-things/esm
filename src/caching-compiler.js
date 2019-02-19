import { sep, resolve } from "./safe/path.js"

import COMPILER from "./constant/compiler.js"
import ENTRY from "./constant/entry.js"
import ENV from "./constant/env.js"
import ESM from "./constant/esm.js"

import Compiler from "./compiler.js"
import GenericBuffer from "./generic/buffer.js"

import exists from "./fs/exists.js"
import getCachePathHash from "./util/get-cache-path-hash.js"
import isMJS from "./path/is-mjs.js"
import getEnv from "./util/get-env.js"
import mkdirp from "./fs/mkdirp.js"
import parseJSON from "./util/parse-json.js"
import realProcess from "./real/process.js"
import relative from "./path/relative.js"
import removeFile from "./fs/remove-file.js"
import shared from "./shared.js"
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
    NYC
  } = ENV

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
        mtime: -1,
        scriptData: null,
        sourceType: SOURCE_TYPE_SCRIPT,
        transforms: 0,
        yieldIndex: -1
      }

      if (length > 2) {
        const deflatedFirstAwaitOutsideFunction = meta[5]

        let firstAwaitOutsideFunction = null

        if (deflatedFirstAwaitOutsideFunction !== null) {
          firstAwaitOutsideFunction = [
            deflatedFirstAwaitOutsideFunction[0],
            deflatedFirstAwaitOutsideFunction[1]
          ]
        }

        let filename = meta[6]

        if (filename) {
          filename = resolve(pkg.cachePath, filename)
        }

        result.filename = filename
        result.firstAwaitOutsideFunction = firstAwaitOutsideFunction
        result.mtime = +meta[3]
        result.sourceType = +meta[4]
        result.transforms = +meta[2]
      }

      if (length > 7 &&
          result.sourceType === SOURCE_TYPE_MODULE) {
        entry.type = TYPE_ESM
        result.circular = +meta[7]
        result.yieldIndex = +meta[8]
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

  function onExit() {
    realProcess.setMaxListeners(Math.max(realProcess.getMaxListeners() - 1, 0))

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
        dirty =
          NYC ||
          !! parseJSON(getEnv("ESM_DISABLE_CACHE")) ||
          exists(resolve(cachePath, "../@babel/register"))

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
        const compileData = compileDatas.get(cacheName)
        const cachedData = compileData != null ? compileData.scriptData : null

        let scriptData
        let changed = false

        if (cachedData === null) {
          scriptData = useCreateCachedData
            ? script.createCachedData()
            : script.cachedData
        }

        if (scriptData &&
            scriptData.length) {
          changed = true
        }

        if (compileData) {
          if (scriptData) {
            compileData.scriptData = scriptData
          } else if (cachedData &&
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

        const compileData = compileDatas.get(cacheName)

        if (compileData != null) {
          const {
            filename,
            firstAwaitOutsideFunction,
            mtime,
            sourceType,
            transforms
          } = compileData

          let deflatedFirstAwaitOutsideFunction = null

          if (firstAwaitOutsideFunction !== null) {
            deflatedFirstAwaitOutsideFunction = [
              firstAwaitOutsideFunction.column,
              firstAwaitOutsideFunction.line
            ]
          }

          if (sourceType === SOURCE_TYPE_SCRIPT) {
            if (transforms !== 0) {
              meta.push(
                transforms,
                mtime,
                sourceType,
                deflatedFirstAwaitOutsideFunction,
                relative(cachePath, filename)
              )
            }
          } else {
            meta.push(
              transforms,
              mtime,
              sourceType,
              deflatedFirstAwaitOutsideFunction,
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
          const compileData = compileDatas.get(cacheName)
          const [offsetStart, offsetEnd] = meta

          if (compileData != null) {
            scriptData = compileData.scriptData
          } else if (offsetStart !== -1 &&
                     offsetEnd !== -1) {
            scriptData = GenericBuffer.slice(buffer, offsetStart, offsetEnd)
          }
        }

        if (scriptData) {
          meta[0] = offset
          meta[1] = offset += scriptData.length
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
      compileDatas.forEach(({ code }, cacheName) => {
        if (writeFile(cachePath + sep + cacheName, code)) {
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
    let { cjsVars, topLevelReturn } = options

    if (isMJS(options.filename)) {
      cjsVars = void 0
      topLevelReturn = void 0
    }

    const { runtimeName } = options

    if (options.eval) {
      // Set `topLevelReturn` to `true` so that the "Illegal return statement"
      // syntax error will occur within `eval()`.
      return {
        cjsVars,
        runtimeName,
        topLevelReturn: true
      }
    }

    return {
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
  realProcess
    .setMaxListeners(realProcess.getMaxListeners() + 1)
    .once("exit", onExit)

  return CachingCompiler
}

export default shared.inited
  ? shared.module.CachingCompiler
  : shared.module.CachingCompiler = init()
