import compiler from "./caching-compiler.js"
import Entry from "./entry.js"
import Error from "./error.js"
import fs from "./fs.js"
import Module from "module"
import path from "path"
import Runtime from "./runtime.js"
import SemVer from "semver"
import utils from "./utils.js"
import Wrapper from "./wrapper.js"
import vm from "vm"

let allowTopLevelAwait = process.mainModule !== void 0 &&
  SemVer.satisfies(process.version, ">=7.6.0")

function extManager(func, mod, filename) {
  const filePath = path.resolve(filename)
  const pkgInfo = utils.getPkgInfo(path.dirname(filePath))
  const wrapped = pkgInfo === null ? null : Wrapper.find(exts, ".js", pkgInfo.range)

  return wrapped === null
    ? func.call(this, mod, filePath)
    : wrapped.call(this, func, pkgInfo, mod, filePath)
}

function extWrap(func, pkgInfo, mod, filePath) {
  const cachePath = pkgInfo.cachePath
  const extname = path.extname(filePath)
  const pkgOptions = pkgInfo.options

  if (cachePath === null ||
      (extname !== ".mjs" && (pkgOptions.esm === "mjs" || ! pkgOptions.esm))) {
    return func.call(this, mod, filePath)
  }

  const cache = pkgInfo.cache
  const cacheKey = fs.mtime(filePath)
  const cacheFileName = utils.getCacheFileName(filePath, cacheKey, pkgInfo)
  const md5Hash = path.basename(cacheFileName, extname).substr(8, 4)
  const runtimeAlias = utils.encodeIdent("_" + md5Hash)

  const prepareError = (error) => {
    Error.captureStackTrace(error, extManager)
    Error.maskStackTrace(error, runtimeAlias, sourceCode)
    return error
  }

  const readFile = (filePath) => (
    pkgOptions.gz && path.extname(filePath) === ".gz"
      ? fs.gunzip(fs.readFile(filePath), "utf8")
      : fs.readFile(filePath, "utf8")
  )

  let cacheCode
  let sourceCode
  let cacheValue = cache.get(cacheFileName)

  if (cacheValue === true) {
    cacheCode = readFile(path.join(cachePath, cacheFileName))
    sourceCode = () => readFile(filePath)
  } else {
    sourceCode = readFile(filePath)
  }

  if (! utils.isObject(cacheValue)) {
    if (cacheValue === true) {
      cacheValue = { code: cacheCode, type: "module" }
      cache.set(cacheFileName, cacheValue)
    } else {
      try {
        cacheValue = compiler.compile(sourceCode, {
          cacheFileName,
          cachePath,
          filePath,
          pkgInfo,
          runtimeAlias
        })
      } catch (e) {
        throw prepareError(e)
      }
    }
  }

  const isESM = cacheValue.type === "module"
  let output = cacheValue.code

  if (isESM) {
    Runtime.enable(mod)

    let async = ""

    if (allowTopLevelAwait && pkgOptions.await) {
      allowTopLevelAwait = false
      if (process.mainModule === mod ||
          process.mainModule.children.some((child) => child === mod)) {
        async = "async "
      }
    }

    if (! pkgOptions.cjs) {
      const wrap = Module.wrap
      Module.wrap = (script) => {
        Module.wrap = wrap
        return '"use strict";(function(){const ' +
          runtimeAlias + "=this;" + script + "\n})"
      }
    }

    output =
      (pkgOptions.cjs ? '"use strict";const ' + runtimeAlias + "=this;" : "") +
      runtimeAlias + ".r(" + async + "function(){" + output + "\n}" +
      (pkgOptions.cjs ? ",1" : "") + ")"
  }

  try {
    mod._compile(output, filePath)
  } catch (e) {
    throw prepareError(e)
  }

  if (! isESM) {
    mod.loaded = true
    const entry = Entry.getOrCreate(mod.exports, mod)
    Runtime.prototype.update.call({ entry })
    entry.loaded()
  }
}

const exts = Module._extensions
const extsJs = Wrapper.unwrap(exts, ".js")
const extsToWrap = [".js", ".gz", ".js.gz", ".mjs.gz", ".mjs"]

extsToWrap.forEach((key) => {
  if (typeof exts[key] !== "function") {
    // Mimic the built-in Node behavior of treating files with unrecognized
    // extensions as .js.
    exts[key] = extsJs
  }
  Wrapper.manage(exts, key, extManager)
  Wrapper.wrap(exts, key, extWrap)
})
