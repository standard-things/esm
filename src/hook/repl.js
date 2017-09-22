import PkgInfo from "../pkg-info.js"
import { REPLServer } from "repl"
import Runtime from "../runtime.js"
import Wrapper from "../wrapper.js"

import captureStackTrace from "../error/capture-stack-trace.js"
import compiler from "../caching-compiler.js"
import createOptions from "../util/create-options.js"
import encodeId from "../util/encode-id.js"
import env from "../env.js"
import getCacheFileName from "../util/get-cache-file-name.js"
import isObject from "../util/is-object.js"
import maskStackTrace from "../error/mask-stack-trace.js"
import md5 from "../util/md5.js"
import rootModule from "../root-module.js"
import wrap from "../util/wrap.js"

function hook(vm) {
  const md5Hash = md5(Date.now()).slice(0, 3)
  const pkgInfo = PkgInfo.get("")
  const runtimeAlias = encodeId("_" + md5Hash)

  function managerWrapper(manager, func, args) {
    const wrapped = Wrapper.find(vm, "createScript", pkgInfo.range)
    return wrapped.call(this, manager, func, args)
  }

  function methodWrapper(manager, func, args) {
    function tryWrapper(func, args) {
      try {
        return func.apply(this, args)
      } catch (e) {
        const [code] = args
        captureStackTrace(e, manager)
        throw maskStackTrace(e, code)
      }
    }

    let [code, scriptOptions] = args
    scriptOptions = createOptions(scriptOptions)

    if (scriptOptions.produceCachedData === void 0) {
      scriptOptions.produceCachedData = true
    }

    const cache = pkgInfo.cache
    const cacheFileName = getCacheFileName(null, code, pkgInfo)
    const cacheValue = cache[cacheFileName]

    let output

    if (isObject(cacheValue)) {
      output = cacheValue.code
      if (scriptOptions.produceCachedData === true &&
          scriptOptions.cachedData === void 0 &&
          cacheValue.data !== void 0) {
        scriptOptions.cachedData = cacheValue.data
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

    const result = tryWrapper(func, [output, scriptOptions])

    if (result.cachedDataProduced) {
      cache[cacheFileName].data = result.cachedData
    }

    result.runInContext = wrap(result.runInContext, tryWrapper)
    result.runInThisContext = wrap(result.runInThisContext, tryWrapper)
    return result
  }

  Wrapper.manage(vm, "createScript", managerWrapper)
  Wrapper.wrap(vm, "createScript", methodWrapper)

  const exported = {}

  if (rootModule.id === "<repl>") {
    Runtime.enable(rootModule, exported, pkgInfo.options)
    return
  }

  const { createContext } = REPLServer.prototype

  if (env.preload &&
      process.argv.length < 2 &&
      typeof createContext === "function") {
    REPLServer.prototype.createContext = function () {
      REPLServer.prototype.createContext = createContext
      const context = createContext.call(this)
      Runtime.enable(context.module, exported, pkgInfo.options)
      return context
    }
  }
}

export default hook
