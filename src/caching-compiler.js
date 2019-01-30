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

      return compileAndCache(code, options)
    },
    from(entry) {
      const { cache, cachePath } = entry.package
      const { cacheName } = entry
      const { map } = cache
      const meta = map[cacheName]

      if (meta === void 0) {
        return null
      }

      const { length } = meta

      const result = {
        changed: false,
        circular: 0,
        code: null,
        codeWithTDZ: null,
        filename: null,
        firstAwaitOutsideFunction: null,
        mtime: -1,
        scriptData: null,
        sourceType: SOURCE_TYPE_SCRIPT,
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
          filename = resolve(cachePath, filename)
        }

        result.changed = !! meta[2]
        result.filename = filename
        result.firstAwaitOutsideFunction = firstAwaitOutsideFunction
        result.mtime = +meta[3]
        result.sourceType = +meta[4]
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
      cache.compile[cacheName] = result

      return result
    }
  }

  function compileAndCache(code, options) {
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
    const result = compileAndCache(code, options)

    if (! cacheName ||
        ! cachePath ||
        ! result.changed) {
      return result
    }

    const { pendingWrites } = shared

    if (! Reflect.has(pendingWrites, cachePath)) {
      pendingWrites[cachePath] = { __proto__: null }
    }

    pendingWrites[cachePath][cacheName] = result
    return result
  }

  function onExit() {
    realProcess.setMaxListeners(Math.max(realProcess.getMaxListeners() - 1, 0))

    const { pendingScripts, pendingWrites } = shared
    const { dir } = shared.package

    for (const cachePath in dir) {
      if (cachePath === "") {
        continue
      }

      const cache = dir[cachePath]
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
        Reflect.deleteProperty(dir, cachePath)
        Reflect.deleteProperty(pendingScripts, cachePath)
        Reflect.deleteProperty(pendingWrites, cachePath)
      }

      if (noCacheDir) {
        continue
      }

      if (dirty) {
        writeMarker(cachePath + sep + ".dirty")
        removeFile(cachePath + sep + ".data.blob")
        removeFile(cachePath + sep + ".data.json")

        for (const cacheName in cache.compile) {
          removeFile(cachePath + sep + cacheName)
        }
      }
    }

    const pendingScriptDatas = { __proto__: null }
    const useCreateCachedData = shared.support.createCachedData

    for (const cachePath in pendingScripts) {
      const cache = dir[cachePath]
      const compileDatas = cache.compile
      const { map } = cache
      const scripts = pendingScripts[cachePath]

      for (const cacheName in scripts) {
        const compileData = compileDatas[cacheName]
        const cachedData = compileData ? compileData.scriptData : null
        const script = scripts[cacheName]

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

            const meta = map[cacheName]

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
          if (! Reflect.has(pendingScriptDatas, cachePath)) {
            pendingScriptDatas[cachePath] = { __proto__: null }
          }

          pendingScriptDatas[cachePath][cacheName] = scriptData
        }
      }
    }

    for (const cachePath in pendingScriptDatas) {
      const cache = dir[cachePath]
      const { buffer, map } = cache
      const compileDatas = cache.compile
      const scriptDatas = pendingScriptDatas[cachePath]

      for (const cacheName in scriptDatas) {
        let meta = map[cacheName]

        if (meta !== void 0) {
          continue
        }

        meta = [-1, -1]

        const compileData = compileDatas[cacheName]

        if (compileData) {
          const {
            filename,
            firstAwaitOutsideFunction,
            mtime,
            sourceType
          } = compileData

          const changed = +compileData.changed

          let deflatedFirstAwaitOutsideFunction = null

          if (firstAwaitOutsideFunction !== null) {
            deflatedFirstAwaitOutsideFunction = [
              firstAwaitOutsideFunction.column,
              firstAwaitOutsideFunction.line
            ]
          }

          if (sourceType === SOURCE_TYPE_SCRIPT) {
            if (changed) {
              meta.push(
                changed,
                mtime,
                sourceType,
                deflatedFirstAwaitOutsideFunction,
                relative(cachePath, filename)
              )
            }
          } else {
            meta.push(
              changed,
              mtime,
              sourceType,
              deflatedFirstAwaitOutsideFunction,
              relative(cachePath, filename),
              compileData.circular,
              compileData.yieldIndex
            )
          }
        }

        map[cacheName] = meta
      }

      const buffers = []

      let offset = 0

      for (const cacheName in map) {
        const meta = map[cacheName]

        if (meta === void 0) {
          continue
        }

        const compileData = compileDatas[cacheName]
        const [offsetStart, offsetEnd] = meta

        let scriptData = scriptDatas[cacheName]

        if (scriptData === void 0) {
          if (compileData) {
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
      }

      writeFile(cachePath + sep + ".data.blob", GenericBuffer.concat(buffers))
      writeFile(cachePath + sep + ".data.json", JSON.stringify({
        map,
        version: PACKAGE_VERSION
      }))
    }

    for (const cachePath in pendingWrites) {
      const contents = pendingWrites[cachePath]

      for (const cacheName in contents) {
        const { code } = contents[cacheName]

        if (writeFile(cachePath + sep + cacheName, code)) {
          removeExpired(cachePath, cacheName)
        }
      }
    }
  }

  function removeExpired(cachePath, cacheName) {
    const cache = shared.package.dir[cachePath]
    const pathHash = getCachePathHash(cacheName)

    for (const otherCacheName in cache) {
      if (otherCacheName !== cacheName &&
          otherCacheName.startsWith(pathHash)) {
        Reflect.deleteProperty(cache.compile, otherCacheName)
        Reflect.deleteProperty(cache.map, otherCacheName)
        removeFile(cachePath + sep + otherCacheName)
      }
    }
  }

  function toCompileOptions(options = {}) {
    let { cjsVars, topLevelReturn } = options

    if (isMJS(options.filename)) {
      cjsVars = void 0
      topLevelReturn = void 0
    }

    const { runtimeName } = options

    if (options.eval) {
      return {
        cjsVars,
        runtimeName,
        topLevelReturn
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
