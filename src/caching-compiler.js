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
  return options.pkgInfo.cache[options.cacheFilename] = result
}

function compileAndWrite(content, options) {
  const result = compileAndCache(content, options)

  if (result.sourceType === "module") {
    const cacheFilePath = path.join(options.cachePath, options.cacheFilename)
    const code = result.code
    const isGzipped = path.extname(cacheFilePath) === ".gz"
    const content = () => isGzipped ? fs.gzip(code) : code
    const encoding = isGzipped ? null : "utf8"
    const scopePath = options.pkgInfo.dirPath

    fs.writeFileDefer(cacheFilePath, content, { encoding, scopePath })
  }

  return result
}

function toCompileOptions(options) {
  const compileOptions = {
    repl: options.repl,
    runtimeAlias: options.runtimeAlias,
    sourceType: void 0
  }

  const filePath = options.filePath
  const sourceType = options.pkgInfo.options.sourceType

  if (typeof filePath === "string") {
    let extname = path.extname(filePath)

    if (extname === ".gz") {
      extname = path.extname(path.basename(filePath, extname))
    }

    if (typeof sourceType === "string") {
      compileOptions.sourceType = sourceType
    } else if (extname === ".mjs") {
      compileOptions.sourceType = "module"
    }
  }

  return compileOptions
}

Object.setPrototypeOf(Compiler.prototype, null)

export default Compiler
