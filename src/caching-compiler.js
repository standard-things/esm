import { extname, resolve } from "path"

import Compiler from "./compiler.js"
import NullObject from "./null-object.js"

import gzip from "./fs/gzip.js"
import mkdirp from "./fs/mkdirp.js"
import removeFile from "./fs/remove-file.js"
import shared from "./shared.js"
import writeFile from "./fs/write-file.js"

const { concat } = Buffer
const { max } = Math
const { stringify } = JSON

class CachingCompiler {
  static compile(entry, code, options) {
    if (entry.module.filename &&
        entry.package.cachePath) {
      return compileAndWrite(entry, code, options)
    }

    return compileAndCache(entry, code, options)
  }

  static from(entry) {
    const { cache } = entry.package

    if (! cache ||
        ! cache["data.json"] ||
        ! cache["data.json"][entry.cacheName] ||
        ! cache["data.blob"]) {
      return null
    }

    const result = new NullObject
    const metaData = cache["data.json"][entry.cacheName]
    const scriptData = cache["data.blob"].slice(metaData[1], metaData[2])

    const exportNames = metaData[3]

    const exportSpecifiers = new NullObject
    result.exportSpecifiers = new NullObject

    if (exportNames) {
      for (const exportName of exportNames) {
        exportSpecifiers[exportName] = 1
      }
    }

    result.changed = true
    result.esm = !! metaData[0]
    result.exportNames = exportNames
    result.exportSpecifiers = exportSpecifiers
    result.exportStars = metaData[4]
    result.moduleSpecifiers = metaData[5]
    result.warnings = metaData[6]
    result.scriptData = scriptData
    return result
  }
}

function compileAndCache(entry, code, options) {
  const result =
  entry.package.cache[entry.cacheName] =
  Compiler.compile(code, toCompileOptions(entry, options))

  const { exportNames } = result

  const exportSpecifiers =
  result.exportSpecifiers = new NullObject

  if (exportNames) {
    for (const exportName of exportNames) {
      exportSpecifiers[exportName] = 1
    }
  }

  // Add "main" to enable the `readFileFast` fast path of
  // `process.binding("fs").internalModuleReadJSON`.
  result.code = '"main";' + result.code
  return result
}

function compileAndWrite(entry, code, options) {
  const result = compileAndCache(entry, code, options)

  if (! result.changed) {
    return result
  }

  const { cacheName } = entry
  const { cachePath } = entry.package
  const cacheFilename = resolve(cachePath, cacheName)
  const content = result.code

  shared.pendingWrites[cacheFilename] = {
    cacheName,
    cachePath,
    content,
    entry
  }

  return result
}

function removeExpired(cache, cachePath, cacheName) {
  const shortname = cacheName.slice(0, 8)

  for (const key in cache) {
    if (key !== cacheName &&
        key.startsWith(shortname)) {
      removeFile(resolve(cachePath, key))
    }
  }
}

function toCompileOptions(entry, options) {
  return {
    cjs: entry.package.options.cjs,
    hint: options.hint,
    runtimeName: entry.runtimeName,
    type: options.type,
    var: options.var
  }
}

Object.setPrototypeOf(CachingCompiler.prototype, null)

if (! shared.inited) {
  process.setMaxListeners(process.getMaxListeners() + 1)
  process.once("exit", () => {
    const pendingMeta = new NullObject

    for (const cacheFilename in shared.pendingWrites) {
      let {
        cacheName,
        cachePath,
        content,
        entry
      } = shared.pendingWrites[cacheFilename]

      if (! mkdirp(cachePath)) {
        continue
      }

      if (extname(cacheFilename) === ".gz") {
        content = gzip(content)
      }

      if (! writeFile(cacheFilename, content)) {
        continue
      }

      removeExpired(entry.package.cache, cachePath, cacheName)

      let meta = pendingMeta[cachePath]

      if (! meta) {
        meta =
        pendingMeta[cachePath] = new NullObject

        meta.buffers = []
        meta.map = new NullObject
        meta.offset = 0
      }

      const cached = entry.package.cache[cacheName]
      const { scriptData } = cached

      let offsetStart = -1
      let offsetEnd = -1

      if (scriptData) {
        offsetStart = meta.offset
        offsetEnd = meta.offset += scriptData.length
        meta.buffers.push(scriptData)
      }

      meta.map[cacheName] = [
        cached.esm ? 1 : 0,
        offsetStart,
        offsetEnd,
        cached.exportNames,
        cached.exportStars,
        cached.moduleSpecifiers,
        cached.warnings
      ]
    }

    for (const cachePath in pendingMeta) {
      const meta = pendingMeta[cachePath]

      writeFile(resolve(cachePath, "data.blob"), concat(meta.buffers))
      writeFile(resolve(cachePath, "data.json"), stringify(meta.map))
    }

    process.setMaxListeners(max(process.getMaxListeners() - 1, 0))
  })
}

export default CachingCompiler
