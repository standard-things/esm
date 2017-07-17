import compiler from "./caching-compiler.js"
import Error from "./error.js"
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
  const md5Hash = utils.md5(Date.now()).substr(0, 3)
  const runtimeAlias = utils.encodeIdent("_" + md5Hash)

  const managerWrapper = function (manager, func, code, options) {
    const pkgInfo = utils.getPkgInfo()
    const wrapped = Wrapper.find(vm, "createScript", pkgInfo.range)
    return wrapped.call(this, manager, func, pkgInfo, code, options)
  }

  const methodWrapper = function (manager, func, pkgInfo, code, options) {
    options = utils.createOptions(options)

    const cache = pkgInfo.cache
    const cacheFileName = utils.getCacheFileName(null, code, pkgInfo)
    const cacheValue = cache.get(cacheFileName)

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
        Error.captureStackTrace(e, manager)
        throw Error.maskStackTrace(e, code)
      }
    }

    output =
      '"use strict";var ' + runtimeAlias + "=" + runtimeAlias +
      "||[module.exports,module.exports={}][0];" + output

    let result

    try {
      result = func.call(this, output, options)
    } catch (e) {
      Error.captureStackTrace(e, manager)
      throw Error.maskStackTrace(e, code, output)
    }

    const runWrapper = function (func, args) {
      try {
        return func.apply(this, args)
      } catch (e) {
        throw Error.maskStackTrace(e, code, output)
      }
    }

    if (result.cachedDataProduced) {
      cache.get(cacheFileName).data = result.cachedData
    }

    result.runInContext = utils.wrapApply(result.runInContext, runWrapper)
    result.runInThisContext = utils.wrapApply(result.runInThisContext, runWrapper)
    return result
  }

  Wrapper.manage(vm, "createScript", managerWrapper)
  Wrapper.wrap(vm, "createScript", methodWrapper)
  Runtime.enable(rootModule)
}
