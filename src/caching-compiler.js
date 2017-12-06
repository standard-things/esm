import { extname, resolve } from "path"

import compiler from "./compiler.js"
import gzip from "./fs/gzip.js"
import removeFile from "./fs/remove-file.js"
import writeFileDefer from "./fs/write-file-defer.js"

const { compile } = compiler

class Compiler {
  static compile(code, options) {
    if (typeof options.cachePath === "string" &&
        typeof options.filePath === "string") {
      return compileAndWrite(code, options)
    }

    return compileAndCache(code, options)
  }
}

function compileAndCache(code, options) {
  const result = compile(code, toCompileOptions(options))
  options.pkgInfo.cache[options.cacheFileName] = result
  return result
}

function compileAndWrite(code, options) {
  const result = compileAndCache(code, options)

  // Add "main" to enable `readFile` fast path.
  const output =
    (result.esm ? '"main";' : '"use script";"main";') +
    result.code

  const { cache, dirPath:scopePath } = options.pkgInfo
  const cachePath = options.cachePath
  const cacheFileName = options.cacheFileName
  const cacheFilePath = resolve(cachePath, cacheFileName)
  const isGzipped = extname(cacheFilePath) === ".gz"
  const content = () => isGzipped ? gzip(output) : output
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

Object.setPrototypeOf(Compiler.prototype, null)

export default Compiler
