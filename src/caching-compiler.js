import compiler from "./compiler.js"
import fs from "./fs.js"
import path from "path"

class Compiler {
  static compile(content, options) {
    options = Object.assign(Object.create(null), options)
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

  if (result.sourceType === "module") {
    const cachePath = options.cachePath
    const cacheFileName = options.cacheFileName
    const cacheFilePath = path.join(cachePath, cacheFileName)
    const isGzipped = path.extname(cacheFilePath) === ".gz"
    const pkgInfo = options.pkgInfo

    const code = result.code
    const content = () => isGzipped ? fs.gzip(code) : code
    const encoding = isGzipped ? null : "utf8"
    const scopePath = pkgInfo.dirPath

    fs.writeFileDefer(cacheFilePath, content, { encoding, scopePath }, (success) => {
      if (success) {
        // Delete expired cache files.
        const shortname = cacheFileName.slice(0, 8)
        pkgInfo.cache.keys().forEach((key) => {
          if (key !== cacheFileName &&
              key.startsWith(shortname)) {
            fs.removeFile(path.join(cachePath, key))
          }
        })
      }
    })
  }

  return result
}

function toCompileOptions(options) {
  let extname = ".js"
  const filePath = options.filePath
  const pkgOptions = options.pkgInfo.options

  const compileOptions = {
    cjs: pkgOptions.cjs,
    ext: pkgOptions.ext,
    repl: options.repl,
    runtimeAlias: options.runtimeAlias,
    sourceType: options.repl ? "module" : "script"
  }

  if (typeof filePath === "string") {
    extname = path.extname(filePath)
    if (extname === ".gz") {
      extname = path.extname(path.basename(filePath, extname))
    }
  }

  if (pkgOptions.js) {
    compileOptions.sourceType = "unambiguous"
  } else if (extname === ".mjs") {
    compileOptions.sourceType = "module"
  }

  return compileOptions
}

Object.setPrototypeOf(Compiler.prototype, null)

export default Compiler
