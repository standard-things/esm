import compiler from "./compiler.js"
import createOptions from "./util/create-options.js"
import gzip from "./fs/gzip.js"
import path from "path"
import removeFile from "./fs/remove-file.js"
import writeFileDefer from "./fs/write-file-defer.js"

class Compiler {
  static compile(content, options) {
    options = createOptions(options)
    return typeof options.filePath === "string"
      ? compileWithFilename(content, options)
      : compileAndCache(content, options)
  }
}

function compileWithFilename(content, options) {
  try {
    return compileAndWrite(content, options)
  } catch (e) {
    e.message += " while processing file: " + options.filePath
    throw e
  }
}

function compileAndCache(content, options) {
  const result = compiler.compile(content, toCompileOptions(options))
  options.pkgInfo.cache.set(options.cacheFileName, result)
  return result
}

function compileAndWrite(content, options) {
  const result = compileAndCache(content, options)

  if (result.type === "module") {
    const cachePath = options.cachePath
    const cacheFileName = options.cacheFileName
    const cacheFilePath = path.join(cachePath, cacheFileName)
    const isGzipped = path.extname(cacheFilePath) === ".gz"
    const pkgInfo = options.pkgInfo

    const code = result.code
    const content = () => isGzipped ? gzip(code) : code
    const encoding = isGzipped ? null : "utf8"
    const scopePath = pkgInfo.dirPath

    writeFileDefer(cacheFilePath, content, { encoding, scopePath }, (success) => {
      if (success) {
        // Delete expired cache files.
        const shortname = cacheFileName.slice(0, 8)
        pkgInfo.cache.keys().forEach((key) => {
          if (key !== cacheFileName &&
              key.startsWith(shortname)) {
            removeFile(path.join(cachePath, key))
          }
        })
      }
    })
  }

  return result
}

function toCompileOptions(options) {
  const pkgOptions = options.pkgInfo.options

  return {
    cjs: pkgOptions.cjs,
    ext: pkgOptions.ext,
    runtimeAlias: options.runtimeAlias,
    type: pkgOptions.esm === "js" ? "unambiguous" : "module",
    var: pkgOptions.var
  }
}

Object.setPrototypeOf(Compiler.prototype, null)

export default Compiler
