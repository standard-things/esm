import { sep, relative, resolve } from "./safe/path.js"

import ENTRY from "./constant/entry.js"
import ENV from "./constant/env.js"
import ESM from "./constant/esm.js"
import SOURCE_TYPE from "./constant/source-type.js"

import Compiler from "./compiler.js"
import GenericBuffer from "./generic/buffer.js"

import assign from "./util/assign.js"
import exists from "./fs/exists.js"
import getCacheName from "./util/get-cache-name.js"
import getCachePathHash from "./util/get-cache-path-hash.js"
import isMJS from "./path/is-mjs.js"
import getEnv from "./util/get-env.js"
import mkdirp from "./fs/mkdirp.js"
import noop from "./util/noop.js"
import parseJSON from "./util/parse-json.js"
import realProcess from "./real/process.js"
import removeFile from "./fs/remove-file.js"
import shared from "./shared.js"
import writeFile from "./fs/write-file.js"

function init() {
  const {
    TYPE_CJS,
    TYPE_ESM
  } = ENTRY

  const {
    NYC
  } = ENV

  const {
    PKG_VERSION
  } = ESM

  const {
    MODULE,
    SCRIPT
  } = SOURCE_TYPE

  const CachingCompiler = {
    compile(entry, code, options = {}) {
      const pkg = entry.package
      const packageOptions = pkg.options
      const { cjs } = packageOptions

      options.cacheName = entry.cacheName
      options.cachePath = pkg.cachePath
      options.filename = entry.filename
      options.cjsVars = cjs.vars
      options.packageOptions = packageOptions
      options.runtimeName = entry.runtimeName
      options.topLevelReturn = cjs.topLevelReturn

      let result

      if (! options.eval &&
          options.filename &&
          options.cachePath) {
        result = compileAndWrite(code, options)
      } else {
        result = compileAndCache(code, options)
      }

      if (options.eval) {
        return result
      }

      if (result.sourceType === MODULE) {
        entry.type = TYPE_ESM
      } else {
        entry.type = TYPE_CJS
      }

      entry.compileData =
      entry.package.cache.compile[entry.cacheName] = result

      return result
    },
    from(entry) {
      const { cache, cachePath } = entry.package
      const { cacheName } = entry
      const { map } = cache
      const meta = map[cacheName]

      if (! meta) {
        return null
      }

      let filename = meta[2]

      if (filename) {
        filename = resolve(cachePath, filename)
      }

      const result = {
        changed: !! meta[5],
        code: null,
        dependencySpecifiers: meta[6] || null,
        enforceTDZ: noop,
        exportedFrom: meta[7] || null,
        exportedNames: meta[8] || null,
        exportedSpecifiers: null,
        exportedStars: meta[9] || null,
        filename,
        mtime: meta[3] || -1,
        scriptData: null,
        sourceType: +meta[4] || SCRIPT,
        yieldIndex: -1
      }

      if (result.sourceType === MODULE) {
        entry.type = TYPE_ESM
        result.dependencySpecifiers = inflateDependencySpecifiers(result)
        result.exportedFrom = inflateExportedFrom(result)
        result.exportedSpecifiers = inflateExportedSpecifiers(result)
        result.yieldIndex = +meta[10] || -1
      } else {
        entry.type = TYPE_CJS
      }

      const [offsetStart, offsetEnd] = meta

      if (offsetStart !== -1 &&
          offsetEnd !== -1) {
        result.scriptData = GenericBuffer.slice(cache.buffer, offsetStart, offsetEnd)
      }

      entry.compileData =
      cache.compile[cacheName] = result

      return result
    }
  }

  function compileAndCache(code, options) {
    const result = Compiler.compile(code, toCompileOptions(options))

    if (options.eval) {
      const cacheName = getCacheName(code, {
        cachePath: options.cachePath,
        filename: options.filename,
        packageOptions: options.packageOptions
      })

      return shared.package.dir[""].compile[cacheName] = result
    }

    if (result.sourceType === MODULE) {
      result.dependencySpecifiers = inflateDependencySpecifiers(result)
      result.exportedFrom = inflateExportedFrom(result)
      result.exportedSpecifiers = inflateExportedSpecifiers(result)
    }

    result.filename = options.filename
    result.mtime = options.mtime
    return result
  }

  function compileAndWrite(code, options) {
    const { cachePath } = options
    const result = compileAndCache(code, options)

    if (! cachePath ||
        ! result.changed) {
      return result
    }

    const pendingWrites =
      shared.pendingWrites[cachePath] ||
      (shared.pendingWrites[cachePath] = { __proto__: null })

    pendingWrites[options.cacheName] = result.code

    return result
  }

  function deflateDependencySpecifiers(compileData) {
    const { dependencySpecifiers } = compileData
    const result = { __proto__: null }

    for (const specifier in dependencySpecifiers) {
      result[specifier] = dependencySpecifiers[specifier].exportedNames
    }

    return result
  }

  function inflateDependencySpecifiers(compileData) {
    const { dependencySpecifiers } = compileData
    const result = { __proto__: null }

    for (const specifier in dependencySpecifiers) {
      result[specifier] = {
        entry: null,
        exportedNames: dependencySpecifiers[specifier]
      }
    }

    return result
  }

  function inflateExportedFrom(compileData) {
    return assign({ __proto__: null }, compileData.exportedFrom)
  }

  function inflateExportedSpecifiers(compileData) {
    const result = { __proto__: null }

    for (const exportedName of compileData.exportedNames) {
      result[exportedName] = true
    }

    const { exportedFrom } = compileData

    for (const specifier in exportedFrom) {
      for (const names of exportedFrom[specifier]) {
        result[names[0]] = {
          local: names[names.length - 1],
          specifier
        }
      }
    }

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
        cache.dirty =
          NYC ||
          parseJSON(getEnv("ESM_DISABLE_CACHE")) ||
          exists(resolve(cachePath, "../@babel/register"))
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
        const cachedData = compileData && compileData.scriptData
        const script = scripts[cacheName]

        let scriptData
        let changed = false

        if (! cachedData) {
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

            if (meta) {
              meta[0] =
              meta[1] = -1
            }

            scriptData =
            compileData.scriptData = null
          }
        }

        if (changed &&
            cacheName) {
          const scriptDatas =
            pendingScriptDatas[cachePath] ||
            (pendingScriptDatas[cachePath] = { __proto__: null })

          scriptDatas[cacheName] = scriptData
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

        if (meta) {
          continue
        }

        meta = [-1, -1]

        const compileData = compileDatas[cacheName]

        if (compileData) {
          const {
            filename,
            mtime,
            sourceType
          } = compileData

          const changed = +compileData.changed

          if (sourceType === SCRIPT) {
            if (changed) {
              meta.push(
                relative(cachePath, filename),
                mtime,
                sourceType,
                changed
              )
            }
          } else {
            meta.push(
              relative(cachePath, filename),
              mtime,
              sourceType,
              changed,
              deflateDependencySpecifiers(compileData),
              compileData.exportedFrom,
              compileData.exportedNames,
              compileData.exportedStars,
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

        if (! meta) {
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
        version: PKG_VERSION
      }))
    }

    for (const cachePath in pendingWrites) {
      const contents = pendingWrites[cachePath]

      for (const cacheName in contents) {
        const content = contents[cacheName]

        if (writeFile(cachePath + sep + cacheName, content)) {
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
    const { runtimeName } = options

    let cjsVars
    let topLevelReturn

    if (! isMJS(options.filename)) {
      cjsVars = options.cjsVars
      topLevelReturn = options.topLevelReturn
    }

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
