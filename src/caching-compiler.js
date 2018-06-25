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
import has from "./util/has.js"
import isCacheName from "./util/is-cache-name.js"
import isMJS from "./util/is-mjs.js"
import mkdirp from "./fs/mkdirp.js"
import noop from "./util/noop.js"
import realProcess from "./real/process.js"
import removeFile from "./fs/remove-file.js"
import { sep } from "./safe/path.js"
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
    compile(entry, code, options) {
      if (! options.eval &&
          entry.module.filename &&
          entry.package.cachePath) {
        return compileAndWrite(entry, code, options)
      }

      return compileAndCache(entry, code, options)
    },
    from(entry) {
      const { cache } = entry.package
      const { cacheName } = entry
      const { map } = cache

      const meta = has(map, cacheName)
        ? map[cacheName]
        : null

      if (! meta) {
        return null
      }

      const result = {
        changed: !! meta[3],
        code: null,
        dependencySpecifiers: meta[5] || null,
        enforceTDZ: noop,
        exportedFrom: meta[6] || null,
        exportedNames: meta[7] || null,
        exportedSpecifiers: null,
        exportedStars: meta[8] || null,
        scriptData: null,
        sourceType: +meta[2] || SCRIPT,
        topLevelReturn: !! meta[4],
        warnings: meta[9] || null
      }

      if (result.sourceType === MODULE) {
        entry.type = TYPE_ESM
        result.dependencySpecifiers = inflateDependencySpecifiers(result)
        result.exportedFrom = inflateExportedFrom(result)
        result.exportedSpecifiers = inflateExportedSpecifiers(result)
      } else {
        entry.type = TYPE_CJS
      }

      const { buffer } = cache
      const offsetStart = meta[0]
      const offsetEnd = meta[1]

      if (buffer &&
          offsetStart !== -1 &&
          offsetEnd !== -1) {
        result.scriptData = GenericBuffer.slice(buffer, offsetStart, offsetEnd)
      }

      entry.compileData =
      cache.compile[cacheName] = result

      return result
    }
  }

  function compileAndCache(entry, code, options) {
    const result = Compiler.compile(code, toCompileOptions(entry, options))

    if (options.eval) {
      const cacheName = getCacheName(entry, code)

      return shared.package.dir[""].compile[cacheName] = result
    }

    if (result.sourceType === MODULE) {
      entry.type = TYPE_ESM
      result.dependencySpecifiers = inflateDependencySpecifiers(result)
      result.exportedFrom = inflateExportedFrom(result)
      result.exportedSpecifiers = inflateExportedSpecifiers(result)
    } else {
      entry.type = TYPE_CJS
    }

    entry.compileData =
    entry.package.cache.compile[entry.cacheName] = result

    return result
  }

  function compileAndWrite(entry, code, options) {
    const { cachePath } = entry.package
    const result = compileAndCache(entry, code, options)

    if (! cachePath ||
        ! result.changed) {
      return result
    }

    const pendingWrites =
      shared.pendingWrites[cachePath] ||
      (shared.pendingWrites[cachePath] = { __proto__: null })

    pendingWrites[entry.cacheName] = entry

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

  function removeCacheFile(cachePath, cacheName) {
    const cache = shared.package.dir[cachePath]

    Reflect.deleteProperty(cache.compile, cacheName)
    Reflect.deleteProperty(cache.map, cacheName)
    removeFile(cachePath + sep + cacheName)
  }

  function removeExpired(cachePath, cacheName) {
    const cache = shared.package.dir[cachePath]
    const pathHash = getCachePathHash(cacheName)

    for (const otherCacheName in cache) {
      if (otherCacheName !== cacheName &&
          otherCacheName.startsWith(pathHash) &&
          isCacheName(otherCacheName)) {
        removeCacheFile(cachePath, cacheName)
      }
    }
  }

  function toCompileOptions(entry, options) {
    const { runtimeName } = entry
    const { warnings } = options

    const cjs = isMJS(entry.module)
      ? void 0
      : entry.package.options.cjs

    if (options.eval) {
      return {
        cjs,
        runtimeName,
        warnings
      }
    }

    return {
      cjs,
      hint: options.hint,
      pragmas: options.pragmas,
      runtimeName,
      sourceType: options.sourceType,
      strict: options.strict,
      var: options.var,
      warnings
    }
  }

  function writeMarker(filename) {
    if (! exists(filename)) {
      writeFile(filename, "")
    }
  }

  if (shared.inited) {
    return CachingCompiler
  }

  realProcess.setMaxListeners(realProcess.getMaxListeners() + 1)

  realProcess.once("exit", () => {
    realProcess.setMaxListeners(Math.max(realProcess.getMaxListeners() - 1, 0))

    const { pendingScripts, pendingWrites } = shared
    const { dir } = shared.package

    for (const cachePath in dir) {
      if (cachePath === "") {
        continue
      }

      if (NYC) {
        writeMarker(cachePath + sep + ".nyc")
      }

      const cache = dir[cachePath]

      if (! cache.dirty) {
        continue
      }

      Reflect.deleteProperty(pendingScripts, cachePath)
      Reflect.deleteProperty(pendingWrites, cachePath)

      if (! mkdirp(cachePath)) {
        continue
      }

      writeMarker(cachePath + sep + ".dirty")

      for (const cacheName in cache.compile) {
        if (cacheName === ".data.blob" ||
            cacheName === ".data.json" ||
            isCacheName(cacheName)) {
          removeCacheFile(cachePath, cacheName)
        }
      }
    }

    const pendingScriptDatas = { __proto__: null }
    const useCreateCachedData = shared.support.createCachedData

    for (const cachePath in pendingScripts) {
      if (! mkdirp(cachePath)) {
        continue
      }

      const cache = dir[cachePath]
      const compileDatas = cache.compile
      const scripts = pendingScripts[cachePath]

      for (const cacheName in scripts) {
        const compileData = compileDatas[cacheName]
        const script = scripts[cacheName]

        let cachedData

        if (compileData &&
            compileData !== true) {
          cachedData = compileData.scriptData
        }

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

            const { map } = cache

            const meta = has(map, cacheName)
              ? map[cacheName]
              : null

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
      const compileDatas = cache.compile
      const scriptDatas = pendingScriptDatas[cachePath]

      for (const cacheName in compileDatas) {
        const compileData = compileDatas[cacheName]

        if (compileData &&
            compileData !== true &&
            ! scriptDatas[cacheName]) {
          scriptDatas[cacheName] = compileData.scriptData
        }
      }

      const buffers = []
      const map = { __proto__: null }

      let offset = 0

      for (const cacheName in scriptDatas) {
        let offsetStart = -1
        let offsetEnd = -1

        const scriptData = scriptDatas[cacheName]

        if (scriptData) {
          offsetStart = offset
          offsetEnd = offset += scriptData.length
          buffers.push(scriptData)
        }

        const compileData = compileDatas[cacheName]
        const meta = [offsetStart, offsetEnd]

        if (compileData) {
          const { sourceType, warnings } = compileData
          const changed = +compileData.changed
          const topLevelReturn = +compileData.topLevelReturn

          if (sourceType === SCRIPT) {
            if (topLevelReturn) {
              meta.push(
                sourceType,
                changed,
                topLevelReturn
              )
            } else if (changed) {
              meta.push(
                sourceType,
                changed
              )
            }
          } else {
            meta.push(
              sourceType,
              changed,
              topLevelReturn,
              deflateDependencySpecifiers(compileData) || 0,
              compileData.exportedFrom || 0,
              compileData.exportedNames || 0,
              compileData.exportedStars || 0
            )

            if (warnings) {
              meta.push(warnings)
            }
          }
        }

        map[cacheName] = meta
      }

      writeFile(cachePath + sep + ".data.blob", GenericBuffer.concat(buffers))
      writeFile(cachePath + sep + ".data.json", JSON.stringify({
        version: PKG_VERSION,
        // eslint-disable-next-line sort-keys
        map
      }))
    }

    for (const cachePath in pendingWrites) {
      if (! mkdirp(cachePath)) {
        continue
      }

      const entries = pendingWrites[cachePath]

      for (const cacheName in entries) {
        const code = entries[cacheName].compileData.code

        if (writeFile(cachePath + sep + cacheName, code)) {
          removeExpired(cachePath, cacheName)
        }
      }
    }
  })

  return CachingCompiler
}

export default shared.inited
  ? shared.module.CachingCompiler
  : shared.module.CachingCompiler = init()
