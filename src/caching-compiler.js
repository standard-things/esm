import { extname, resolve } from "path"

import Compiler from "./compiler.js"
import NullObject from "./null-object.js"

import assign from "./util/assign.js"
import gzip from "./fs/gzip.js"
import parseJSON from "./util/parse-json.js"
import removeFile from "./fs/remove-file.js"
import writeFileDefer from "./fs/write-file-defer.js"

const codeOfAsterisk = "*".charCodeAt(0)
const codeOfLeftBracket = "{".charCodeAt(0)
const codeOfRightBracket = "}".charCodeAt(0)
const codeOfSlash = "/".charCodeAt(0)

const { keys } = Object
const { stringify } = JSON

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
    result.esm = false

    // Extract metadata.
    if (code.charCodeAt(7) !== codeOfSlash ||
        code.charCodeAt(8) !== codeOfAsterisk ||
        code.charCodeAt(9) !== codeOfLeftBracket) {
      return result
    }

    const line = code.slice(9, code.indexOf("*/", 10))

    if (line.charCodeAt(line.length - 1) !== codeOfRightBracket) {
      return result
    }

    const meta = parseJSON(line)

    if (! meta) {
      return result
    }

    const metaKeys = keys(meta)

    if (metaKeys.length !== 4 ||
        metaKeys[0] !== "e" ||
        metaKeys[1] !== "m" ||
        metaKeys[2] !== "s" ||
        metaKeys[3] !== "w") {
      return result
    }

    result.esm = true
    result.exportSpecifiers = assign(new NullObject, meta.e)
    result.exportStarNames = meta.s
    result.moduleSpecifiers = assign(new NullObject, meta.m)
    result.warnings = meta.w
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
