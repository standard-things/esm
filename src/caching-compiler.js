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
  static assignMeta(object, code) {
    object.esm = code.charCodeAt(7) === codeOfSlash

    if (object.esm) {
      const line = code.slice(9, code.indexOf("*/", 10))
      const meta = parse(line)

      object.exportSpecifiers = assign(new NullObject, meta.e)
      object.exportStarNames = meta.s
      object.moduleSpecifiers = assign(new NullObject, meta.m)
      object.warnings = meta.w
    }

    return object
  }

  static compile(code, options) {
    if (typeof options.cachePath === "string" &&
        typeof options.filePath === "string") {
      return compileAndWrite(code, options)
    }

    return compileAndCache(code, options)
  }
}

function compileAndCache(code, options) {
  const result =
  options.pkgInfo.cache[options.cacheFileName] =
  Compiler.compile(code, toCompileOptions(options))

  // Add "main" to enable the `readFileFast` fast path of
  // `process.binding("fs").internalModuleReadJSON`.
  let output = '"main";'

  if (result.esm) {
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

function compileAndWrite(code, options) {
  const result = compileAndCache(code, options)

  if (! result.changed) {
    return result
  }

  const { cache, dirPath:scopePath } = options.pkgInfo
  const cachePath = options.cachePath
  const cacheFileName = options.cacheFileName
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

function toCompileOptions(options) {
  return {
    cjs: options.pkgInfo.options.cjs,
    hint: options.hint,
    runtimeName: options.runtimeName,
    type: options.type,
    var: options.var
  }
}

Object.setPrototypeOf(CachingCompiler.prototype, null)

export default CachingCompiler
