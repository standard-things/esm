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
import maskStackTrace from "../error/mask-stack-trace.js"
import md5 from "../util/md5.js"
import rootModule from "../root-module.js"
import tryParse from "../try-parse.js"
import wrap from "../util/wrap.js"

const { now } = Date

function hook(vm) {
  let entry

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

    let cached = cache[cacheFileName]

    if (cached) {
      if (scriptOptions.produceCachedData === true &&
          scriptOptions.cachedData === void 0 &&
          cached.data !== void 0) {
        scriptOptions.cachedData = cached.data
      }
    } else {
      cached = tryWrapper(Compiler.compile, [sourceCode, {
        cacheFileName,
        pkgInfo,
        runtimeName,
        type: "unambiguous",
        var: true,
        warnings: false
      }])
    }

    const content =
      '"use strict";var ' + runtimeName + "=" + runtimeName +
      "||[module.exports,module.exports=module.exports.entry.exports][0];" + cached.code

    entry.esm = cached.esm
    entry.exportSpecifiers = cached.exportSpecifiers
    entry.exportStarNames = cached.exportStarNames
    entry.moduleSpecifiers = cached.moduleSpecifiers
    entry.state = 1
    entry.warnings = cached.warnings

    if (entry.esm) {
      tryParse(entry)
    }

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
    entry = Entry.get(rootModule)
    entry.options = pkgInfo.options
    entry.runtimeName = runtimeName
    Runtime.enable(entry, exported)
    return
  }

  const { createContext } = REPLServer.prototype

  if (typeof createContext !== "function") {
    return
  }

  REPLServer.prototype.createContext = function () {
    REPLServer.prototype.createContext = createContext

    const context = createContext.call(this)

    entry = Entry.get(context.module)
    entry.options = pkgInfo.options
    entry.runtimeName = runtimeName
    Runtime.enable(entry, exported)
    return context
  }
}

export default hook
