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

function managerWrapper(manager, func, mod, filePath) {
  filePath = path.resolve(filePath)
  const pkgInfo = utils.getPkgInfo(path.dirname(filePath))
  const wrapped = pkgInfo === null ? null : Wrapper.find(exts, ".js", pkgInfo.range)

  return wrapped === null
    ? func.call(this, mod, filePath)
    : wrapped.call(this, manager, func, pkgInfo, mod, filePath)
}

function methodWrapper(manager, func, pkgInfo, mod, filePath) {
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

  const readFile = (filePath) => (
    pkgOptions.gz && path.extname(filePath) === ".gz"
      ? fs.gunzip(fs.readFile(filePath), "utf8")
      : fs.readFile(filePath, "utf8")
  )

  const wrapModule = (script) => (
    '"use strict";(function(){const ' + runtimeAlias + "=this;" + script + "\n})"
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
        Error.captureStackTrace(e, manager)
        throw Error.maskStackTrace(e, sourceCode)
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
        return wrapModule(script)
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
    throw Error.maskStackTrace(e, sourceCode, wrapModule(output))
  }

  if (! isESM) {
    mod.loaded = true
    Entry.getOrCreate(mod.exports, mod).update().loaded()
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
  Wrapper.manage(exts, key, managerWrapper)
  Wrapper.wrap(exts, key, methodWrapper)
})
