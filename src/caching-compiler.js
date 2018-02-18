import ASCII from "./ascii.js"
import Compiler from "./compiler.js"
import GenericBuffer from "./generic/buffer.js"

import assign from "./util/assign.js"
import getCacheFileName from "./util/get-cache-file-name.js"
import isCacheFileName from "./util/is-cache-file-name.js"
import mkdirp from "./fs/mkdirp.js"
import removeFile from "./fs/remove-file.js"
import { resolve } from "path"
import shared from "./shared.js"
import writeFile from "./fs/write-file.js"

const {
  PERIOD
} = ASCII

const { stringify } = JSON

class CachingCompiler {
  static compile(entry, code, options) {
    if (! options.eval &&
        entry.module.filename &&
        entry.package.cachePath) {
      return compileAndWrite(entry, code, options)
    }

    return compileAndCache(entry, code, options)
  }

  static from(entry) {
    const { cache } = entry.package
    const { cacheName } = entry

    const meta =
      cache &&
      cache.map &&
      cache.map[cacheName]

    if (! meta) {
      return null
    }

    const dependencySpecifiers = meta[3]
      ? assign({ __proto__: null }, meta[3])
      : null

    const result = {
      changed: false,
      code: null,
      dependencySpecifiers,
      esm: !! meta[2],
      exportNames: meta[4] || null,
      exportSpecifiers: null,
      exportStars: meta[5] || null,
      scriptData: null,
      warnings: meta[6] || null
    }

    if (result.esm) {
      const exportSpecifiers =
      result.exportSpecifiers = { __proto__: null }

      for (const exportName of result.exportNames) {
        exportSpecifiers[exportName] = 1
      }
    }

    const { buffer } = cache
    const offsetStart = meta[0]
    const offsetEnd = meta[1]

    if (buffer &&
        offsetStart !== -1 &&
        offsetEnd !== -1) {
      result.scriptData = GenericBuffer.slice(buffer, offsetStart, offsetEnd)
    }

    return result
  }
}

function compileAndCache(entry, code, options) {
  const result = Compiler.compile(code, toCompileOptions(entry, options))

  if (options.eval) {
    const cache = shared.package.dir[""]
    const cacheName = getCacheFileName(entry, code)
    return cache.compile[cacheName] = result
  }

  const { cache, cachePath } = entry.package
  const { cacheName } = entry

  if (cachePath) {
    // Add "main" to enable the `readFileFast` fast path of
    // `process.binding("fs").internalModuleReadJSON`.
    result.code = '"main";' + result.code
  }

  if (result.esm) {
    const exportSpecifiers =
    result.exportSpecifiers = { __proto__: null }

    for (const exportName of result.exportNames) {
      exportSpecifiers[exportName] = 1
    }
  }

  return cache.compile[cacheName] = result
}

function compileAndWrite(entry, code, options) {
  const result = compileAndCache(entry, code, options)

  if (! result.changed) {
    return result
  }

  const { cachePath } = entry.package

  const pendingWrites =
    shared.pendingWrites[cachePath] ||
    (shared.pendingWrites[cachePath] = { __proto__: null })

  pendingWrites[entry.cacheName] = result.code

  return result
}

function removeCacheFile(cachePath, cacheName) {
  const cache = shared.package.dir[cachePath]

  delete cache.compile[cacheName]
  delete cache.map[cacheName]
  return removeFile(resolve(cachePath, cacheName))
}

function removeExpired(cachePath, cacheName) {
  const cache = shared.package.dir[cachePath]
  const shortname = cacheName.slice(0, 8)

  for (const otherCacheName in cache) {
    if (otherCacheName !== cacheName &&
        otherCacheName.startsWith(shortname) &&
        isCacheFileName(otherCacheName)) {
      removeCacheFile(cachePath, cacheName)
    }
  }
}

function toCompileOptions(entry, options) {
  if (options.eval) {
    return {
      cjs: entry.package.options.cjs,
      runtimeName: entry.runtimeName
    }
  }

  return {
    cjs: entry.package.options.cjs,
    hint: options.hint,
    runtimeName: entry.runtimeName,
    strict: options.strict,
    type: options.type,
    var: options.var
  }
}

Object.setPrototypeOf(CachingCompiler.prototype, null)

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

      delete pendingWrites[cachePath]
      delete pendingMetas[cachePath]

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
      const scriptDatas = pendingMetas[cachePath]

      for (const cacheName in cache) {
        const cached = cache.compile[cacheName]

        if (cached &&
            cached !== true &&
            ! scriptDatas[cacheName]) {
          scriptDatas[cacheName] = cached.scriptData
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

        const cached = cache.compile[cacheName]

        if (cached) {
          map[cacheName] = [
            offsetStart,
            offsetEnd,
            cached.esm,
            cached.dependencySpecifiers,
            cached.exportNames,
            cached.exportStars,
            cached.warnings
          ]
        } else {
          map[cacheName] = [offsetStart, offsetEnd]
        }
      }

      writeFile(resolve(cachePath, ".data.blob"), GenericBuffer.concat(buffers))
      writeFile(resolve(cachePath, ".data.json"), stringify(map))
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

export default CachingCompiler
