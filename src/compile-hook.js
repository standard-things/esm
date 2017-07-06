import compiler from "./caching-compiler.js"
import Entry from "./entry.js"
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
      (extname !== ".mjs" && pkgOptions.esm === "mjs")) {
    return func.call(this, mod, filePath)
  }

  const cache = pkgInfo.cache
  const cacheKey = fs.mtime(filePath)
  const cacheFileName = utils.getCacheFileName(filePath, cacheKey, pkgInfo)
  const md5Hash = path.basename(cacheFileName, extname).slice(-8)
  const runtimeAlias = utils.encodeIdent("_" + md5Hash)

  let cacheValue = cache.get(cacheFileName)
  let codeFilePath = cacheValue === true
    ? path.join(cachePath, cacheFileName)
    : filePath

  let code = pkgOptions.gz && extname === ".gz"
    ? fs.gunzip(fs.readFile(codeFilePath), "utf8")
    : fs.readFile(codeFilePath, "utf8")

  if (! utils.isObject(cacheValue)) {
    if (cacheValue === true) {
      cacheValue = { code, type: "module" }
      cache.set(cacheFileName, cacheValue)
    } else {
      cacheValue = compiler.compile(code, {
        cacheFileName,
        cachePath,
        filePath,
        pkgInfo,
        runtimeAlias
      })
    }
  }

  const isESM = cacheValue.type === "module"
  code = cacheValue.code

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

    code =
      (pkgOptions.cjs ? '"use strict";const ' + runtimeAlias + "=this;" : "") +
      runtimeAlias + ".run(" + async + "function(){" + code + "\n}" +
      (pkgOptions.cjs ? ",1" : "") + ")"
  }

  mod._compile(code, filePath)

  if (! isESM) {
    mod.loaded = true
    const entry = Entry.getOrCreate(mod.exports, mod)
    Runtime.prototype.runSetters.call({ entry })
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
