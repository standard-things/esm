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

const runtimeAlias = utils.encodeIdent("_")

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
  const config = pkgInfo.config
  const extname = path.extname(filePath)

  if (cachePath === null ||
      (extname !== ".mjs" && ! config.js)) {
    return func.call(this, mod, filePath)
  }

  const cache = pkgInfo.cache
  const cacheKey = fs.mtime(filePath)
  const cacheFilename = utils.getCacheFileName(filePath, cacheKey, pkgInfo)

  let cacheValue = cache[cacheFilename]
  let codeFilePath = cacheValue === true
    ? path.join(cachePath, cacheFilename)
    : filePath

    let code = config.gz && extname === ".gz"
    ? fs.gunzip(fs.readFile(codeFilePath), "utf8")
    : fs.readFile(codeFilePath, "utf8")

  if (! utils.isObject(cacheValue)) {
    if (cacheValue === true) {
      cacheValue = cache[cacheFilename] = { code, sourceType: "module" }
    } else {
      cacheValue = compiler.compile(code, { cacheFilename, cachePath, filePath, runtimeAlias, pkgInfo })
    }
  }

  const isESM = cacheValue.sourceType === "module"
  code = cacheValue.code

  if (isESM) {
    Runtime.enable(mod)

    let async = ""
    if (allowTopLevelAwait && config.await) {
      allowTopLevelAwait = false
      if (process.mainModule === mod ||
          process.mainModule.children.some((child) => child === mod)) {
        async = "async "
      }
    }

    if (! config.cjs) {
      const wrap = Module.wrap
      Module.wrap = (script) => {
        Module.wrap = wrap
        return '"use strict";(function(){const ' +
          runtimeAlias + "=this;" + script + "\n})"
      }
    }

    code =
      (config.cjs ? '"use strict";const ' + runtimeAlias + "=exports;" : "") +
      runtimeAlias + ".run(" + async + "function(){" + code + "\n}" +
      (config.cjs ? ",1" : "") + ")"
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
