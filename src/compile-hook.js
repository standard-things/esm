import Entry from "./entry.js"
import Module from "module"
import PkgInfo from "./pkg-info.js"
import Runtime from "./runtime.js"
import SemVer from "semver"
import Wrapper from "./wrapper.js"

import captureStackTrace from "./error/capture-stack-trace.js"
import compiler from "./caching-compiler.js"
import encodeIdent from "./util/encode-ident.js"
import extname from "./util/extname.js"
import getCacheFileName from "./util/get-cache-file-name.js"
import getCacheStateHash from "./util/get-cache-state-hash.js"
import getScriptPragma from "./util/get-script-pragma.js"
import getSourceType from "./util/get-source-type.js"
import gunzip from "./fs/gunzip.js"
import isObject from "./util/is-object.js"
import keys from "./util/keys.js"
import maskStackTrace from "./error/mask-stack-trace.js"
import mtime from "./fs/mtime.js"
import path from "path"
import readFile from "./fs/read-file.js"
import setSourceType from "./util/set-source-type.js"

let allowTopLevelAwait = isObject(process.mainModule) &&
  SemVer.satisfies(process.version, ">=7.6.0")

function managerWrapper(manager, func, args) {
  const filePath = args[1]
  const pkgInfo = PkgInfo.get(path.dirname(filePath))
  const wrapped = pkgInfo === null ? null : Wrapper.find(exts, ".js", pkgInfo.range)

  return wrapped === null
    ? func.apply(this, args)
    : wrapped.call(this, manager, func, pkgInfo, args)
}

function methodWrapper(manager, func, pkgInfo, args) {
  /* eslint consistent-return: off */
  const mod = args[0]
  const filePath = args[1]
  const pkgOptions = pkgInfo.options
  const cachePath = pkgInfo.cachePath

  if (cachePath === null) {
    return func.apply(this, args)
  }

  const ext = extname(filePath)
  let type = getSourceType(mod.exports)

  if (ext === ".mjs" || ext === ".mjs.gz") {
    type = "module"
  } else if (pkgOptions.esm === "js") {
    type = "unambiguous"
  }

  if (pkgOptions.esm === "mjs" && type !== "module") {
    return func.apply(this, args)
  }

  const cache = pkgInfo.cache
  const cacheKey = mtime(filePath)
  const cacheFileName = getCacheFileName(filePath, cacheKey, pkgInfo)

  const stateHash = getCacheStateHash(cacheFileName)
  const runtimeAlias = encodeIdent("_" + stateHash.slice(0, 3))

  let cacheCode
  let sourceCode
  let cacheValue = cache[cacheFileName]

  if (cacheValue === true) {
    cacheCode = readCode(path.join(cachePath, cacheFileName), pkgOptions)
  } else {
    sourceCode = readCode(filePath, pkgOptions)
  }

  if (! isObject(cacheValue)) {
    if (cacheValue === true) {
      if (type === "unambiguous") {
        const scriptPragma = getScriptPragma(cacheFileName)

        if (cacheCode.startsWith(scriptPragma)) {
          type = "script"
          cacheCode = cacheCode.slice(scriptPragma.length)
        } else {
          type = "module"
        }
      }

      cacheValue = { code: cacheCode, type }
      cache[cacheFileName] = cacheValue
    } else {
      const compilerOptions = {
        cacheFileName,
        cachePath,
        filePath,
        pkgInfo,
        runtimeAlias,
        type
      }

      if (pkgOptions.debug) {
        cacheValue = compiler.compile(sourceCode, compilerOptions)
      } else {
        try {
          cacheValue = compiler.compile(sourceCode, compilerOptions)
        } catch (e) {
          captureStackTrace(e, manager)
          throw maskStackTrace(e, sourceCode)
        }
      }
    }
  }

  const isESM = cacheValue.type === "module"
  const exported = Object.create(null)

  let output = cacheValue.code
  let entry = Entry.get(mod, exported, pkgOptions)

  if (isESM) {
    setSourceType(exported, "module")
    Runtime.enable(mod, exported, pkgOptions)

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
        return '"use strict";(function(){const ' + runtimeAlias + "=this;" +
          script + "\n})"
      }
    }

    output =
      (pkgOptions.cjs ? '"use strict";const ' + runtimeAlias + "=this;" : "") +
      runtimeAlias + ".r((" + async + "function(){" + output + "\n}))"
  } else {
    setSourceType(exported, "script")
    Runtime.enable(mod, exported, pkgOptions)

    output =
      "const " + runtimeAlias + "=this;" + runtimeAlias +
      ".r((function(exports,require,module,__filename,__dirname){" +
      output + "\n}),require)"
  }

  if (pkgOptions.debug) {
    mod._compile(output, filePath)
  } else {
    try {
      mod._compile(output, filePath)
    } catch (e) {
      throw maskStackTrace(e)
    }
  }

  if (isESM) {
    return
  }

  Entry.set(mod.exports, entry.merge(Entry.get(mod, mod.exports, pkgOptions)))

  mod.loaded = true

  if (pkgOptions.cjs) {
    const getterPairs = keys(mod.exports)
      .map((key) => [key, () => mod.exports[key]])

    entry.addGetters(getterPairs)
  }

  entry.update().loaded()
}

function readCode(filePath, options) {
  return options.gz && path.extname(filePath) === ".gz"
    ? gunzip(readFile(filePath), "utf8")
    : readFile(filePath, "utf8")
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
