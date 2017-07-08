import compiler from "./caching-compiler.js"
import Error from "./error.js"
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
  // Enable ESM in the default Node REPL by loading @std/esm upon entering.
  // Custom REPLs can still define their own eval functions to bypass this,
  // but that's a feature, not a drawback.
  const md5Hash = utils.md5(Date.now()).substr(0, 4)
  const runtimeAlias = utils.encodeIdent("_" + md5Hash)

  const extManager = function (func, code, options) {
    const pkgInfo = utils.getPkgInfo()
    const wrapped = Wrapper.find(vm, "createScript", pkgInfo.range)
    return wrapped.call(this, func, pkgInfo, code, options)
  }

  const extWrap = function (func, pkgInfo, code, options) {
    options = Object.assign(Object.create(null), options)

    const cache = pkgInfo.cache
    const cacheFileName = utils.getCacheFileName(null, code, pkgInfo)
    const cacheValue = cache.get(cacheFileName)

    const prepareError = (error) => {
      Error.captureStackTrace(error, extManager)
      Error.maskStackTrace(error, runtimeAlias, code)
      return error
    }

    if (options.produceCachedData === void 0) {
      options.produceCachedData = true
    }

    let output

    if (utils.isObject(cacheValue)) {
      output = cacheValue.code
      if (options.produceCachedData === true &&
          options.cachedData === void 0 &&
          cacheValue.data !== void 0) {
        options.cachedData = cacheValue.data
      }
    } else {
      try {
        output = compiler.compile(code, {
          cacheFileName,
          pkgInfo,
          runtimeAlias
        }).code
      } catch (e) {
        throw prepareError(e)
      }
    }

    output =
      '"use strict";var ' + runtimeAlias + "=" + runtimeAlias +
      "||[module.exports,module.exports={}][0];" + output

    let result

    try {
      result = func.call(this, output, options)
    } catch (e) {
      throw prepareError(e)
    }

    if (result.cachedDataProduced) {
      cache.get(cacheFileName).data = result.cachedData
    }

    return result
  }

  Wrapper.manage(vm, "createScript", extManager)
  Wrapper.wrap(vm, "createScript", extWrap)
  Runtime.enable(rootModule)
}
