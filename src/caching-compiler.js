import CHAR_CODE from "./constant/char-code.js"
import ENTRY from "./constant/entry.js"
import SOURCE_TYPE from "./constant/source-type.js"

import Compiler from "./compiler.js"
import GenericBuffer from "./generic/buffer.js"

import assign from "./util/assign.js"
import getCacheName from "./util/get-cache-name.js"
import getCachePathHash from "./util/get-cache-path-hash.js"
import has from "./util/has.js"
import isCacheFileName from "./util/is-cache-file-name.js"
import isMJS from "./util/is-mjs.js"
import mkdirp from "./fs/mkdirp.js"
import removeFile from "./fs/remove-file.js"
import { resolve } from "./safe/path.js"
import shared from "./shared.js"
import writeFile from "./fs/write-file.js"

function init() {
  const {
    PERIOD
  } = CHAR_CODE

  const {
    TYPE_CJS,
    TYPE_ESM
  } = ENTRY

  const {
    MODULE,
    SCRIPT
  } = SOURCE_TYPE

  const CachingCompiler = {
    __proto__: null,
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

      const dependencySpecifiers = meta[5]
        ? assign({ __proto__: null }, meta[5])
        : null

      const result = {
        __proto__: null,
        changed: !! meta[3],
        code: null,
        dependencySpecifiers,
        exportNames: meta[6] || null,
        exportSpecifiers: null,
        exportStars: meta[7] || null,
        exportTemporals: meta[8] || null,
        scriptData: null,
        sourceType: +meta[2] || SCRIPT,
        topLevelReturn: !! meta[4],
        warnings: meta[9] || null
      }

      if (result.sourceType === MODULE) {
        entry.type = TYPE_ESM

        const exportSpecifiers =
        result.exportSpecifiers = { __proto__: null }

        for (const exportName of result.exportNames) {
          exportSpecifiers[exportName] = 1
        }
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

      const exportSpecifiers =
      result.exportSpecifiers = { __proto__: null }

      for (const exportName of result.exportNames) {
        exportSpecifiers[exportName] = 1
      }
    } else {
      entry.type = TYPE_CJS
    }

    entry.compileData =
    entry.package.cache.compile[entry.cacheName] = result

    return result
  }

  function compileAndWrite(entry, code, options) {
    const result = compileAndCache(entry, code, options)

    if (! result.changed) {
      return result
    }

    const { cachePath } = entry.package

    if (cachePath) {
      // Add "main" to enable the `readFileFast` fast path of
      // `process.binding("fs").internalModuleReadJSON`.
      result.code = '"main";' + result.code
    }

    const pendingWrites =
      shared.pendingWrites[cachePath] ||
      (shared.pendingWrites[cachePath] = { __proto__: null })

    pendingWrites[entry.cacheName] = result.code

    return result
  }

  function removeCacheFile(cachePath, cacheName) {
    const cache = shared.package.dir[cachePath]

    Reflect.deleteProperty(cache.compile, cacheName)
    Reflect.deleteProperty(cache.map, cacheName)
    return removeFile(resolve(cachePath, cacheName))
  }

  function removeExpired(cachePath, cacheName) {
    const cache = shared.package.dir[cachePath]
    const pathHash = getCachePathHash(cacheName)

    for (const otherCacheName in cache) {
      if (otherCacheName !== cacheName &&
          otherCacheName.startsWith(pathHash) &&
          isCacheFileName(otherCacheName)) {
        removeCacheFile(cachePath, cacheName)
      }
    }
  }

  function toCompileOptions(entry, options) {
    const { runtimeName } = entry

    const cjs = isMJS(entry.module)
      ? void 0
      : entry.package.options.cjs

    if (options.eval) {
      return {
        __proto__: null,
        cjs,
        runtimeName
      }
    }

    return {
      __proto__: null,
      cjs,
      hint: options.hint,
      pragmas: options.pragmas,
      runtimeName,
      sourceType: options.sourceType,
      strict: options.strict,
      var: options.var
    }
  }

  if (! shared.inited) {
    process.setMaxListeners(process.getMaxListeners() + 1)

    process.once("exit", () => {
      process.setMaxListeners(Math.max(process.getMaxListeners() - 1, 0))

      const { pendingMetas, pendingWrites } = shared
      const { dir } = shared.package

      for (const cachePath in dir) {
        if (cachePath === "") {
          continue
        }

        const cache = dir[cachePath]

        if (! cache.dirty) {
          continue
        }

        Reflect.deleteProperty(pendingWrites, cachePath)
        Reflect.deleteProperty(pendingMetas, cachePath)

        if (! mkdirp(cachePath)) {
          continue
        }

        writeFile(resolve(cachePath, ".dirty"), "")

        for (const cacheName in cache.compile) {
          if (cacheName === ".data.blob" ||
              cacheName === ".data.json" ||
              isCacheFileName(cacheName)) {
            removeCacheFile(cachePath, cacheName)
          }
        }
      }

      for (const cachePath in pendingMetas) {
        if (! mkdirp(cachePath)) {
          continue
        }

        const cache = dir[cachePath]
        const compileDatas = cache.compile
        const scriptDatas = pendingMetas[cachePath]

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
          if (cacheName.charCodeAt(0) === PERIOD) {
            continue
          }

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
                compileData.dependencySpecifiers || 0,
                compileData.exportNames || 0,
                compileData.exportStars || 0,
                compileData.exportTemporals || 0
              )

              if (warnings) {
                meta.push(warnings)
              }
            }
          }

          map[cacheName] = meta
        }

        writeFile(resolve(cachePath, ".data.blob"), GenericBuffer.concat(buffers))
        writeFile(resolve(cachePath, ".data.json"), JSON.stringify(map))
      }

      for (const cachePath in pendingWrites) {
        if (! mkdirp(cachePath)) {
          continue
        }

        const contents = pendingWrites[cachePath]

        for (const cacheName in contents) {
          const content = contents[cacheName]

          if (writeFile(resolve(cachePath, cacheName), content)) {
            removeExpired(cachePath, cacheName)
          }
        }
      }
    })
  }

  return CachingCompiler
}

export default shared.inited
  ? shared.module.CachingCompiler
  : shared.module.CachingCompiler = init()
