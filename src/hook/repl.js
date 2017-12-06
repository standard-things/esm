import Compiler from "../caching-compiler.js"
import Entry from "../entry.js"
import PkgInfo from "../pkg-info.js"
import { REPLServer } from "repl"
import Runtime from "../runtime.js"
import Wrapper from "../wrapper.js"

import captureStackTrace from "../error/capture-stack-trace.js"
import createOptions from "../util/create-options.js"
import encodeId from "../util/encode-id.js"
import getCacheFileName from "../util/get-cache-file-name.js"
import isObject from "../util/is-object.js"
import maskStackTrace from "../error/mask-stack-trace.js"
import md5 from "../util/md5.js"
import resolveSpecifiers from "../module/resolve-specifiers.js"
import rootModule from "../root-module.js"
import wrap from "../util/wrap.js"

const { compile } = Compiler
const { now } = Date

function hook(vm) {
  let mod
  const md5Hash = md5(now().toString()).slice(0, 3)
  const pkgInfo = PkgInfo.get("")
  const runtimeName = encodeId("_" + md5Hash)

  function managerWrapper(manager, func, args) {
    const wrapped = Wrapper.find(vm, "createScript", pkgInfo.range)
    return wrapped.call(this, manager, func, args)
  }

  function methodWrapper(manager, func, args) {
    function tryWrapper(func, args) {
      try {
        return func.apply(this, args)
      } catch (e) {
        const [sourceCode] = args
        const useURLs = e.sourceType === "module"

        delete e.sourceType
        captureStackTrace(e, manager)
        throw maskStackTrace(e, sourceCode, null, useURLs)
      }
    }

    let [sourceCode, scriptOptions] = args
    scriptOptions = createOptions(scriptOptions)

    if (scriptOptions.produceCachedData === void 0) {
      scriptOptions.produceCachedData = true
    }

    const cache = pkgInfo.cache
    const cacheFileName = getCacheFileName("", sourceCode, pkgInfo)
    const cacheValue = cache[cacheFileName]

    let content

    if (isObject(cacheValue)) {
      content = cacheValue.code
      if (scriptOptions.produceCachedData === true &&
          scriptOptions.cachedData === void 0 &&
          cacheValue.data !== void 0) {
        scriptOptions.cachedData = cacheValue.data
      }
    } else {
      const compilerOptions = {
        cacheFileName,
        pkgInfo,
        runtimeName,
        type: "unambiguous",
        var: true,
        warnings: false
      }

      content = tryWrapper(compile, [sourceCode, compilerOptions]).code
    }

    resolveSpecifiers(mod, content)

    content =
      '"use strict";var ' + runtimeName + "=" + runtimeName +
      "||[module.exports,module.exports=module.exports.entry.exports][0];" + content

    const result = tryWrapper(func, [content, scriptOptions])

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
    mod = rootModule
    Entry.get(mod).runtimeName = runtimeName
    Runtime.enable(rootModule, exported, pkgInfo.options)
    return
  }

  const { createContext } = REPLServer.prototype

  if (typeof createContext !== "function") {
    return
  }

  REPLServer.prototype.createContext = function () {
    REPLServer.prototype.createContext = createContext
    const context = createContext.call(this)

    mod = context.module
    Entry.get(mod).runtimeName = runtimeName
    Runtime.enable(mod, exported, pkgInfo.options)
    return context
  }
}

export default hook
