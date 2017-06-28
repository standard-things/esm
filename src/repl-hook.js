import compiler from "./caching-compiler.js"
import path from "path"
import Runtime from "./runtime.js"
import utils from "./utils.js"
import vm from "vm"
import Wrapper from "./wrapper.js"

const pkgMain = __non_webpack_module__.filename
let rootModule = __non_webpack_module__

while (rootModule.parent != null) {
  rootModule = rootModule.parent
}

if (rootModule.filename === null &&
    rootModule.id === "<repl>" &&
    rootModule.loaded === false &&
    rootModule.parent === void 0 &&
    rootModule.children.some((child) => child.filename === pkgMain)) {
  // Enable ESM in the default Node REPL by loading `@std/esm` upon entering.
  // Custom REPLs can still define their own eval functions to bypass this,
  // but that's a feature, not a drawback.
  const runtimeAlias = utils.encodeIdent("module")

  Wrapper.manage(vm, "createScript", function (func, code, options) {
    const pkgInfo = utils.getPkgInfo()
    const wrapped = Wrapper.find(vm, "createScript", pkgInfo.range)
    return wrapped.call(this, func, pkgInfo, code, options)
  })

  Wrapper.wrap(vm, "createScript", function (func, pkgInfo, code, options) {
    const cacheFilename = utils.getCacheFileName(null, code, pkgInfo)
    const cacheValue = pkgInfo.cache[cacheFilename]
    const prefix =
      '"use strict";var ' + runtimeAlias + "=" +
      runtimeAlias + "||module.exports;\n";

    options = Object.assign(Object.create(null), options)
    options.lineOffset = (+options.lineOffset || 0) - 1

    if (options.produceCachedData === void 0) {
      options.produceCachedData = true
    }

    if (utils.isObject(cacheValue)) {
      code = cacheValue.code
      if (options.produceCachedData === true &&
          options.cachedData === void 0 &&
          cacheValue.cachedData !== void 0) {
        options.cachedData = cacheValue.cachedData
      }
    } else {
      code = compiler.compile(code, { cacheFilename, pkgInfo, repl: true }).code
    }

    const result = func.call(this, code, options)

    if (result.cachedDataProduced) {
      pkgInfo.cache[cacheFilename].cachedData = result.cachedData
    }
    return result
  })

  Runtime.enable(rootModule)
}
