import { extname, resolve } from "path"

import Compiler from "./compiler.js"
import NullObject from "./null-object.js"

import assign from "./util/assign.js"
import gzip from "./fs/gzip.js"
import removeFile from "./fs/remove-file.js"
import writeFileDefer from "./fs/write-file-defer.js"

const codeOfSlash = "/".charCodeAt(0)

const { stringify, parse } = JSON

class CachingCompiler {
  static compile(code, entry, cacheFileName, options) {
    if (entry.filePath &&
        options.cachePath) {
      return compileAndWrite(code, entry, cacheFileName, options)
    }

    return compileAndCache(code, entry, cacheFileName, options)
  }

  static from(code) {
    const result = new NullObject
    result.changed = true
    result.code = code
    result.esm = code.charCodeAt(7) === codeOfSlash

    if (result.esm) {
      // Extract metadata.
      const line = code.slice(9, code.indexOf("*/", 10))
      const meta = parse(line)

      result.exportSpecifiers = assign(new NullObject, meta.e)
      result.exportStarNames = meta.s
      result.moduleSpecifiers = assign(new NullObject, meta.m)
      result.warnings = meta.w
    }

    return result
  }
}

function compileAndCache(code, entry, cacheFileName, options) {
  const result =
  entry.data.package.cache[cacheFileName] =
  Compiler.compile(code, toCompileOptions(entry, options))

  // Add "main" to enable the `readFileFast` fast path of
  // `process.binding("fs").internalModuleReadJSON`.
  let output = '"main";'

  if (result.esm) {
    // Add metadata.
    output +=
      "/*" +
      stringify({
        e: result.exportSpecifiers,
        m: result.moduleSpecifiers,
        s: result.exportStarNames,
        w: result.warnings
      }) +
      "*/"
  }

  result.code = output + result.code
  return result
}

function compileAndWrite(code, entry, cacheFileName, options) {
  const result = compileAndCache(code, entry, cacheFileName, options)

  if (! result.changed) {
    return result
  }

  const { cache, dirPath:scopePath } = entry.data.package
  const cachePath = options.cachePath
  const cacheFilePath = resolve(cachePath, cacheFileName)
  const isGzipped = extname(cacheFilePath) === ".gz"
  const content = () => isGzipped ? gzip(result.code) : result.code
  const encoding = isGzipped ? null : "utf8"
  const writeOptions = { encoding, scopePath }

  writeFileDefer(cacheFilePath, content, writeOptions, (success) => {
    if (success) {
      removeExpired(cache, cachePath, cacheFileName)
    }
  })

  return result
}

function removeExpired(cache, cachePath, cacheFileName) {
  const shortname = cacheFileName.slice(0, 8)

  for (const key in cache) {
    if (key !== cacheFileName &&
        key.startsWith(shortname)) {
      removeFile(resolve(cachePath, key))
    }
  }
}

function toCompileOptions(entry, options) {
  return {
    cjs: entry.options.cjs,
    hint: options.hint,
    runtimeName: entry.runtimeName,
    type: options.type,
    var: options.var
  }
}

Object.setPrototypeOf(CachingCompiler.prototype, null)

export default CachingCompiler
