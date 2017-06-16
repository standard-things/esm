"use strict"

const compiler = require("./caching-compiler.js")
const fs = require("./fs.js")
const Module = require("module")
const path = require("path")
const Runtime = require("./runtime.js")
const SemVer = require("semver")
const utils = require("./utils.js")
const Wrapper = require("./wrapper.js")
const vm = require("vm")

const moduleAlias = utils.encodeIdent("module")

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

  if (cachePath === null) {
    return func.call(this, mod, filePath)
  }

  const cache = pkgInfo.cache
  const cacheKey = fs.mtime(filePath)
  const cacheFilename = utils.getCacheFileName(filePath, cacheKey, pkgInfo)
  const config = pkgInfo.config

  let cacheValue = cache[cacheFilename]
  let codeFilePath = cacheValue === true
    ? path.join(cachePath, cacheFilename)
    : filePath

  let code = path.extname(filePath) === ".gz"
    ? fs.gunzip(fs.readFile(codeFilePath), "utf8")
    : fs.readFile(codeFilePath, "utf8")

  if (! utils.isObject(cacheValue)) {
    cacheValue = cacheValue === true
      ? { code, sourceType: "module" }
      : compiler.compile(code, { cacheFilename, cachePath, filePath, pkgInfo })
  }

  const isESM = cacheValue.sourceType === "module"
  cache[cacheFilename] = cacheValue
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
          moduleAlias + "=arguments[2];" + script + "\n})"
      }
    }

    code =
      (config.cjs ? '"use strict";const ' + moduleAlias + "=module;" : "") +
      moduleAlias + ".run(" + async + "function(){" + code + "\n})"
  }

  mod._compile(code, filePath)

  if (! isESM) {
    mod.loaded = true
    Runtime.prototype.runSetters.call(mod)
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
