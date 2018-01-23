import { extname, resolve } from "path"

import Compiler from "./compiler.js"
import NullObject from "./null-object.js"

import assign from "./util/assign.js"
import gzip from "./fs/gzip.js"
import mkdirp from "./fs/mkdirp.js"
import parseJSON from "./util/parse-json.js"
import removeFile from "./fs/remove-file.js"
import shared from "./shared.js"
import writeFile from "./fs/write-file.js"

const { keys } = Object
const { max } = Math
const { stringify } = JSON

class CachingCompiler {
  static compile(entry, code, options) {
    if (entry.filePath &&
        entry.data.package.cachePath) {
      return compileAndWrite(entry, code, options)
    }

    return compileAndCache(entry, code, options)
  }

  static from(code) {
    const result = new NullObject
    result.changed = true
    result.code = code
    result.esm = false

    // Extract metadata.
    if (code.charCodeAt(7) !== 47 /* / */ ||
        code.charCodeAt(8) !== 42 /* * */ ||
        code.charCodeAt(9) !== 123 /* { */) {
      return result
    }

    const line = code.slice(9, code.indexOf("*/", 10))

    if (line.charCodeAt(line.length - 1) !== 125 /* } */) {
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

function compileAndCache(entry, code, options) {
  const result =
  entry.data.package.cache[entry.cacheFileName] =
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

function compileAndWrite(entry, code, options) {
  const result = compileAndCache(entry, code, options)

  if (! result.changed) {
    return result
  }

  const { cacheFileName } = entry
  const { cachePath } = entry.data.package
  const cacheFilePath = resolve(cachePath, cacheFileName)
  const content = result.code

  shared.pendingWrites[cacheFilePath] = {
    cacheFileName,
    cachePath,
    content,
    entry
  }

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

if (! shared.inited) {
  process.setMaxListeners(process.getMaxListeners() + 1)
  process.once("exit", () => {
    for (const cacheFilePath in shared.pendingWrites) {
      let {
        cacheFileName,
        cachePath,
        content,
        entry
      } = shared.pendingWrites[cacheFilePath]

      if (! mkdirp(cachePath)) {
        continue
      }

      if (extname(cacheFilePath) === ".gz") {
        content = gzip(content)
      }

      if (writeFile(cacheFilePath, content)) {
        removeExpired(entry.data.package.cache, cachePath, cacheFileName)
      }
    }

    process.setMaxListeners(max(process.getMaxListeners() - 1, 0))
  })
}

export default CachingCompiler
