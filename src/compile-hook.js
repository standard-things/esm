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
import getSourceType from "./util/get-source-type.js"
import gunzip from "./fs/gunzip.js"
import isObject from "./util/is-object.js"
import keys from "./util/keys.js"
import maskStackTrace from "./error/mask-stack-trace.js"
import mtime from "./fs/mtime.js"
import path from "path"
import readFile from "./fs/read-file.js"
import setSourceType from "./util/set-source-type.js"

const esmPkgParent = __non_webpack_module__.parent

let inited = false
let allowTopLevelAwait = isObject(process.mainModule) &&
  SemVer.satisfies(process.version, ">=7.6.0")

function managerWrapper(manager, func, mod, filePath) {
  filePath = path.resolve(filePath)
  const pkgInfo = PkgInfo.get(path.dirname(filePath))
  const wrapped = pkgInfo === null ? null : Wrapper.find(exts, ".js", pkgInfo.range)

  return wrapped === null
    ? func.call(this, mod, filePath)
    : wrapped.call(this, manager, func, pkgInfo, mod, filePath)
}

function methodWrapper(manager, func, pkgInfo, mod, filePath) {
  const pkgOptions = pkgInfo.options
  const cachePath = pkgInfo.cachePath

  if (cachePath === null) {
    func.call(this, mod, filePath)
    return
  }

  let parent = mod.parent
  let parentPkgInfo = null

  if (parent == null || typeof parent.filename !== "string") {
    parent = null
  }

  if (parent !== null) {
    parentPkgInfo = PkgInfo.get(path.dirname(parent.filename))
  }

  if (inited &&
      esmPkgParent.parent !== parent &&
      (parentPkgInfo === null || ! parentPkgInfo.options.cjs) &&
      (parent === null || getSourceType(parent.exports) === "script")) {
    func.call(this, mod, filePath)
    return
  }

  const ext = extname(filePath)
  let type = getSourceType(mod.exports)

  if (ext === ".mjs" || ext === ".mjs.gz") {
    type = "module"
  } else if (pkgOptions.esm === "js") {
    type = "unambiguous"
  }

  if (! pkgOptions.esm && type !== "module") {
    func.call(this, mod, filePath)
    return
  }

  inited = true

  const cache = pkgInfo.cache
  const cacheKey = mtime(filePath)
  const cacheFileName = getCacheFileName(filePath, cacheKey, pkgInfo)

  const md5Hash = path.basename(cacheFileName, ext).substr(8, 3)
  const runtimeAlias = encodeIdent("_" + md5Hash)

  const readCode = (filePath) => (
    pkgOptions.gz && path.extname(filePath) === ".gz"
      ? gunzip(readFile(filePath), "utf8")
      : readFile(filePath, "utf8")
  )

  const wrapModule = (script) => (
    '"use strict";(function(){const ' + runtimeAlias + "=this;" + script + "\n})"
  )

  let cacheCode
  let sourceCode
  let cacheValue = cache[cacheFileName]

  if (cacheValue === true) {
    cacheCode = readCode(path.join(cachePath, cacheFileName))
    sourceCode = () => readCode(filePath)
  } else {
    sourceCode = readCode(filePath)
  }

  if (! isObject(cacheValue)) {
    if (cacheValue === true) {
      if (type === "unambiguous") {
        const useScriptPragma = '"' + md5Hash + ':use script";'

        if (cacheCode.startsWith(useScriptPragma)) {
          type = "script"
          cacheCode = cacheCode.slice(useScriptPragma.length)
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
  let compiledCode = output
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
        return compiledCode = wrapModule(script)
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
      throw maskStackTrace(e, sourceCode, compiledCode)
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
