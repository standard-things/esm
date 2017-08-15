import PkgInfo from "../pkg-info.js"
import Runtime from "../runtime.js"
import Wrapper from "../wrapper.js"

import attempt from "../util/attempt.js"
import compiler from "../caching-compiler.js"
import createOptions from "../util/create-options.js"
import env from "../env.js"
import encodeIdent from "../util/encode-ident.js"
import getCacheFileName from "../util/get-cache-file-name.js"
import isObject from "../util/is-object.js"
import md5 from "../util/md5.js"
import rootModule from "../root-module.js"
import vm from "vm"
import wrap from "../util/wrap.js"

if (env.repl) {
  // Enable ESM in the Node REPL by loading @std/esm upon entering.
  // Custom REPLs can still define their own eval functions to bypass this.
  const md5Hash = md5(Date.now()).slice(0, 3)
  const pkgInfo = PkgInfo.get("")
  const runtimeAlias = encodeIdent("_" + md5Hash)

  const managerWrapper = function (manager, func, args) {
    const wrapped = Wrapper.find(vm, "createScript", pkgInfo.range)
    return wrapped.call(this, manager, func, args)
  }

  const methodWrapper = function (manager, func, args) {
    const code = args[0]
    const options = createOptions(args[1])

    if (options.produceCachedData === void 0) {
      options.produceCachedData = true
    }

    const cache = pkgInfo.cache
    const cacheFileName = getCacheFileName(null, code, pkgInfo)
    const cacheValue = cache[cacheFileName]
    const pkgOptions = pkgInfo.options

    const tryWrapper = function (func, args) {
      const code = args[0]
      const callback = () => func.apply(this, args)
      return pkgOptions.debug ? callback() : attempt(callback, manager, code)
    }

    let output

    if (isObject(cacheValue)) {
      output = cacheValue.code
      if (options.produceCachedData === true &&
          options.cachedData === void 0 &&
          cacheValue.data !== void 0) {
        options.cachedData = cacheValue.data
      }
    } else {
      const compilerOptions = {
        cacheFileName,
        pkgInfo,
        runtimeAlias,
        var: true
      }

      output = tryWrapper(compiler.compile, [code, compilerOptions]).code
    }

    output =
      '"use strict";var ' + runtimeAlias + "=" + runtimeAlias +
      "||[module.exports,module.exports=module.exports.entry.exports][0];" + output

    const result = tryWrapper(func, [output, options])

    if (result.cachedDataProduced) {
      cache[cacheFileName].data = result.cachedData
    }

    result.runInContext = wrap(result.runInContext, tryWrapper)
    result.runInThisContext = wrap(result.runInThisContext, tryWrapper)
    return result
  }

  Wrapper.manage(vm, "createScript", managerWrapper)
  Wrapper.wrap(vm, "createScript", methodWrapper)

  const exported = Object.create(null)
  Runtime.enable(rootModule, exported, pkgInfo.options)
}
