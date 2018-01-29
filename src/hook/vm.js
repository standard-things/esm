import Compiler from "../caching-compiler.js"
import Entry from "../entry.js"
import Module from "../module.js"
import Package from "../package.js"
import { REPLServer } from "repl"
import Runtime from "../runtime.js"
import Wrapper from "../wrapper.js"

import captureStackTrace from "../error/capture-stack-trace.js"
import createOptions from "../util/create-options.js"
import encodeId from "../util/encode-id.js"
import getCacheFileName from "../util/get-cache-file-name.js"
import isCheck from "../env/is-check.js"
import isEval from "../env/is-eval.js"
import isREPL from "../env/is-repl.js"
import isStackTraceMasked from "../util/is-stack-trace-masked.js"
import maskStackTrace from "../error/mask-stack-trace.js"
import md5 from "../util/md5.js"
import rootModule from "../root-module.js"
import validateESM from "../module/esm/validate.js"
import wrap from "../util/wrap.js"

const { now } = Date

function hook(vm) {
  let entry
  const pkg = Package.get("")

  function managerWrapper(manager, func, args) {
    const wrapped = Wrapper.find(vm, "createScript", pkg.range)

    return wrapped.call(this, manager, func, args)
  }

  function methodWrapper(manager, func, args) {
    let [content, scriptOptions] = args
    scriptOptions = createOptions(scriptOptions)

    if (scriptOptions.produceCachedData === void 0) {
      scriptOptions.produceCachedData = true
    }

    if (! entry) {
      initEntry(global.module || rootModule)
    }

    const cacheName =
    entry.cacheName = getCacheFileName(entry, content)

    let cached = entry.package.cache[cacheName]

    if (cached) {
      if (scriptOptions.produceCachedData === true &&
          scriptOptions.cachedData === void 0 &&
          cached.scriptData !== void 0) {
        scriptOptions.cachedData = cached.scriptData
      }
    } else {
      cached = tryWrapper(Compiler.compile, [
        entry,
        content,
        {
          type: "unambiguous",
          var: true,
          warnings: false
        }
      ])
    }

    entry.state = 1

    if (cached.esm) {
      tryValidateESM(manager, entry, content)
    }

    entry.state = 3

    const { runtimeName } = entry

    content =
      "var " + runtimeName + "=" + runtimeName +
      "||[module.exports,module.exports=module.exports.entry.exports][0];" +
      cached.code

    const result = tryWrapper(func, [content, scriptOptions])

    if (result.cachedDataProduced) {
      cached.scriptData = result.cachedData
    }

    result.runInContext = wrap(result.runInContext, tryWrapper)
    result.runInThisContext = wrap(result.runInThisContext, tryWrapper)
    return result
  }

  function initEntry(mod) {
    entry = Entry.get(mod)
    entry.package = pkg
    entry.runtimeName = encodeId("_" + md5(now().toString()).slice(0, 3))
    Runtime.enable(entry, {})
  }

  Wrapper.manage(vm, "createScript", managerWrapper)
  Wrapper.wrap(vm, "createScript", methodWrapper)

  if (isCheck()) {
    const { Script } = vm

    vm.Script = function (code, options) {
      vm.Script = Script
      code = code.slice(Module.wrapper[0].length, -Module.wrapper[1].length)
      return vm.createScript(code, options)
    }
  } else if (isEval())  {
    const { runInThisContext } = vm

    vm.runInThisContext = function (code, options) {
      vm.runInThisContext = runInThisContext
      return vm.createScript(code, options).runInThisContext(options)
    }
  } else if (isREPL()) {
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
}

function tryValidateESM(caller, entry, content) {
  try {
    validateESM(entry)
  } catch (e) {
    if (isStackTraceMasked(e)) {
      throw e
    }

    const { filename } = entry.module

    captureStackTrace(e, caller)
    throw maskStackTrace(e, content, filename, true)
  }
}

function tryWrapper(func, args) {
  try {
    return func.apply(this, args)
  } catch (e) {
    if (isStackTraceMasked(e)) {
      throw e
    }

    const [content] = args
    const isESM = e.sourceType === "module"

    delete e.sourceType
    throw maskStackTrace(e, content, null, isESM)
  }
}

export default hook
