import compiler from "./compiler.js"
import createOptions from "./util/create-options.js"
import gzip from "./fs/gzip.js"
import keys from "./util/keys.js"
import path from "path"
import removeFile from "./fs/remove-file.js"
import writeFileDefer from "./fs/write-file-defer.js"

class Compiler {
  static compile(code, options) {
    options = createOptions(options)
    return typeof options.filePath === "string"
      ? compileWithFilename(code, options)
      : compileAndCache(code, options)
  }
}

function compileWithFilename(code, options) {
  try {
    return compileAndWrite(code, options)
  } catch (e) {
    e.filename = options.filePath
    throw e
  }
}

function compileAndCache(code, options) {
  const result = compiler.compile(code, toCompileOptions(options))
  options.pkgInfo.cache[options.cacheFileName] = result
  return result
}

function compileAndWrite(code, options) {
  const result = compileAndCache(code, options)
  const cachePath = options.cachePath
  const cacheFileName = options.cacheFileName
  const cacheFilePath = path.join(cachePath, cacheFileName)
  const isGzipped = path.extname(cacheFilePath) === ".gz"

  let output = result.code

  if (result.type === "script") {
    output= '"' + options.runtimeAlias + ':script";' + output
  }

  const content = () => isGzipped ? gzip(output) : output
  const encoding = isGzipped ? null : "utf8"
  const pkgInfo = options.pkgInfo
  const scopePath = pkgInfo.dirPath
  const writeOptions = { encoding, scopePath }

  writeFileDefer(cacheFilePath, content, writeOptions, (success) => {
    if (success) {
      removeExpired(pkgInfo.cache, cachePath, cacheFileName)
    }
  })

  return result
}

function removeExpired(cache, cachePath, cacheFileName) {
  const shortname = cacheFileName.slice(0, 8)
  keys(cache).forEach((key) => {
    if (key !== cacheFileName &&
        key.startsWith(shortname)) {
      removeFile(path.join(cachePath, key))
    }
  })
}

function toCompileOptions(options) {
  const pkgOptions = options.pkgInfo.options

  return {
    cjs: pkgOptions.cjs,
    ext: pkgOptions.ext,
    runtimeAlias: options.runtimeAlias,
    type: options.type,
    var: pkgOptions.var
  }
}

Object.setPrototypeOf(Compiler.prototype, null)

export default Compiler
