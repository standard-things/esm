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
import isStackTraceMasked from "../util/is-stack-trace-masked.js"
import maskStackTrace from "../error/mask-stack-trace.js"
import md5 from "../util/md5.js"
import rootModule from "../root-module.js"
import validateESM from "../module/esm/validate.js"
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
        if (isStackTraceMasked(e)) {
          throw e
        }

        const isESM = e.sourceType === "module"
        const [sourceCode] = args

        delete e.sourceType
        captureStackTrace(e, manager)
        throw maskStackTrace(e, sourceCode, null, isESM)
      }
    }

    let [sourceCode, scriptOptions] = args
    scriptOptions = createOptions(scriptOptions)

    if (scriptOptions.produceCachedData === void 0) {
      scriptOptions.produceCachedData = true
    }

    const cacheFileName =
    entry.cacheFileName = getCacheFileName(entry, sourceCode)

    let cached = pkgInfo.cache[cacheFileName]

    if (cached) {
      if (scriptOptions.produceCachedData === true &&
          scriptOptions.cachedData === void 0 &&
          cached.scriptData !== void 0) {
        scriptOptions.cachedData = cached.scriptData
      }
    } else {
      cached = tryWrapper(Compiler.compile, [
        entry,
        sourceCode,
        {
          type: "unambiguous",
          var: true,
          warnings: false
        }
      ])
    }

    entry.compileData = cached
    entry.esm = cached.esm
    entry.state = 1

    if (entry.esm) {
      validateESM(entry)
    }

    const content =
      'var ' + runtimeName + "=" + runtimeName +
      "||[module.exports,module.exports=module.exports.entry.exports][0];" +
      cached.code

    const result = tryWrapper(func, [content, scriptOptions])

    if (result.cachedDataProduced) {
      pkgInfo.cache[cacheFileName].scriptData = result.cachedData
    }

    entry.state = 3
    result.runInContext = wrap(result.runInContext, tryWrapper)
    result.runInThisContext = wrap(result.runInThisContext, tryWrapper)
    return result
  }

  function initEntry(mod) {
    entry = Entry.get(mod)
    entry.package = pkgInfo
    entry.runtimeName = runtimeName
    Runtime.enable(entry, {})
  }

  Wrapper.manage(vm, "createScript", managerWrapper)
  Wrapper.wrap(vm, "createScript", methodWrapper)

  const { createContext } = REPLServer.prototype

  if (rootModule.id === "<repl>") {
    initEntry(rootModule)
  } else if (typeof createContext === "function") {
    REPLServer.prototype.createContext = function () {
      REPLServer.prototype.createContext = createContext
      const context = createContext.call(this)
      initEntry(context.module)
      return context
    }
  }
}

export default hook
