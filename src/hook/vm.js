import ENTRY from "../constant/entry.js"
import SOURCE_TYPE from "../constant/source-type.js"

import Compiler from "../caching-compiler.js"
import Entry from "../entry.js"
import Module from "../module.js"
import Package from "../package.js"
import { REPLServer } from "repl"
import Runtime from "../runtime.js"
import Wrapper from "../wrapper.js"

import binding from "../binding.js"
import builtinEntries from "../builtin-entries.js"
import call from "../util/call.js"
import captureStackTrace from "../error/capture-stack-trace.js"
import clone from "../module/clone.js"
import getCacheFileName from "../util/get-cache-file-name.js"
import has from "../util/has.js"
import isCheck from "../env/is-check.js"
import isError from "../util/is-error.js"
import isEval from "../env/is-eval.js"
import isREPL from "../env/is-repl.js"
import isStackTraceMasked from "../util/is-stack-trace-masked.js"
import makeRequireFunction from "../module/make-require-function.js"
import maskFunction from "../util/mask-function.js"
import maskStackTrace from "../error/mask-stack-trace.js"
import rootModule from "../root-module.js"
import setGetter from "../util/set-getter.js"
import setSetter from "../util/set-setter.js"
import shared from "../shared.js"
import toNullObject from "../util/to-null-object.js"
import validateESM from "../module/esm/validate.js"
import wrap from "../util/wrap.js"

const {
  MODE_ESM,
  STATE_EXECUTION_STARTED,
  STATE_PARSING_STARTED
} = ENTRY

const {
  MODULE,
  UNAMBIGUOUS
} = SOURCE_TYPE

const ExObject = __external__.Object

function hook(vm) {
  let entry
  const pkg = Package.get("")

  const lazyModules = [
    "assert", "async_hooks", "buffer", "child_process", "cluster", "crypto",
    "dgram", "dns", "domain", "events", "fs", "http", "http2", "https", "net",
    "os", "path", "perf_hooks", "punycode", "querystring", "readline", "repl",
    "stream", "string_decoder", "tls", "tty", "url", "util", "v8", "vm", "zlib"
  ]

  if (typeof binding.inspector.connect === "function") {
    lazyModules.push("inspector")
    lazyModules.sort()
  }

  function managerWrapper(manager, func, args) {
    const wrapped = Wrapper.find(vm, "createScript", pkg.range)

    return Reflect.apply(wrapped, this, [manager, func, args])
  }

  function methodWrapper(manager, func, args) {
    let [content, scriptOptions] = args
    scriptOptions = toNullObject(scriptOptions)

    if (! scriptOptions.produceCachedData) {
      scriptOptions.produceCachedData = true
    }

    entry.cacheName = getCacheFileName(entry, content)

    let compileData = entry.package.cache.compile[entry.cacheName]

    if (compileData) {
      if (compileData.scriptData &&
          scriptOptions.produceCachedData &&
          ! has(scriptOptions, "cachedData")) {
        scriptOptions.cachedData = compileData.scriptData
      }
    } else {
      compileData = tryWrapper(Compiler.compile, [
        entry,
        content,
        {
          sourceType: UNAMBIGUOUS,
          strict: false,
          var: true,
          warnings: false
        }
      ])
    }

    entry.state = STATE_PARSING_STARTED

    if (entry.mode === MODE_ESM) {
      tryValidateESM(manager, entry, content)
    }

    entry.state = STATE_EXECUTION_STARTED

    const { runtimeName } = entry

    content =
      "(()=>{" +
        'var g=Function("return this")(),' +
        "m=g.module," +
        "e=m&&m.exports," +
        'k="' + runtimeName + '";' +
        "if(e&&!g[k]){" +
          "m.exports=e.entry.exports;" +
          "require=e.entry.require;" +
          "e.entry.addBuiltinModules(g);" +
          "Reflect.defineProperty(g,k,{" +
            "__proto__:null," +
            "value:e" +
          "})" +
        "}" +
      "})();" +
      compileData.code

    const result = tryWrapper(func, [content, scriptOptions])

    if (result.cachedDataProduced) {
      compileData.scriptData = result.cachedData
    }

    result.runInContext = wrap(result.runInContext, tryWrapper)
    result.runInThisContext = wrap(result.runInThisContext, tryWrapper)
    return result
  }

  function addBuiltinModules(context) {
    const req = entry.require
    const exportedConsole = req("console")

    Reflect.defineProperty(context, "console", {
      __proto__: null,
      configurable: true,
      enumerable: true,
      get: () => exportedConsole
    })

    Reflect.defineProperty(context, "process", {
      __proto__: null,
      configurable: true,
      enumerable: true,
      value: req("process"),
      writable: true
    })

    for (const name of lazyModules) {
      const set = (value) => {
        Reflect.defineProperty(context, name, {
          __proto__: null,
          configurable: true,
          enumerable: true,
          value,
          writable: true
        })
      }

      Reflect.defineProperty(context, name, {
        __proto__: null,
        configurable: true,
        get() {
          const exported = req(name)

          Reflect.defineProperty(context, name, {
            __proto__: null,
            configurable: true,
            get: () => exported,
            set
          })

          return exported
        },
        set
      })
    }
  }

  function initEntry(mod) {
    entry = Entry.get(mod)
    entry.addBuiltinModules = addBuiltinModules
    entry.package = pkg
    entry.require = makeRequireFunction(clone(mod))
    entry.runtimeName = shared.runtimeName
    Runtime.enable(entry, new ExObject)
  }

  Wrapper.manage(vm, "createScript", managerWrapper)
  Wrapper.wrap(vm, "createScript", methodWrapper)

  if (isCheck()) {
    const { Script } = vm

    vm.Script = maskFunction(function (code, options) {
      vm.Script = Script
      const { wrapper } = Module
      code = code.slice(wrapper[0].length, -wrapper[1].length)
      initEntry(rootModule)
      return vm.createScript(code, options)
    }, Script)
  } else if (isEval())  {
    const { runInThisContext } = vm

    vm.runInThisContext = maskFunction(function (code, options) {
      vm.runInThisContext = runInThisContext
      initEntry(shared.unsafeContext.module)
      return vm.createScript(code, options).runInThisContext(options)
    }, runInThisContext)
  } else if (isREPL()) {
    const { createContext } = REPLServer.prototype

    if (rootModule.id === "<repl>") {
      initEntry(rootModule)
    } else {
      if (typeof createContext === "function") {
        REPLServer.prototype.createContext = maskFunction(function () {
          REPLServer.prototype.createContext = createContext
          const context = call(createContext, this)
          initEntry(context.module)
          return context
        }, createContext)
      }

      const { support } = shared

      if (support.inspectProxies) {
        const util = __non_webpack_require__("util")
        const _inspect = util.inspect
        const { inspect } = builtinEntries.util.module.exports

        Reflect.defineProperty(util, shared.symbol.inspect, {
          __proto__: null,
          configurable: true,
          value: true,
          writable: true
        })

        if (support.replShowProxy) {
          util.inspect = inspect
        } else {
          setGetter(util, "inspect", () => {
            util.inspect = inspect
            return _inspect
          })

          setSetter(util, "inspect", (value) => {
            Reflect.defineProperty(util, "inspect", {
              __proto__: null,
              configurable: true,
              enumerable: true,
              value,
              writable: true
            })
          })
        }
      }
    }
  }
}

function tryValidateESM(caller, entry, content) {
  try {
    validateESM(entry)
  } catch (e) {
    if (! isError(e) ||
        isStackTraceMasked(e)) {
      throw e
    }

    const { filename } = entry.module

    captureStackTrace(e, caller)
    throw maskStackTrace(e, content, filename, true)
  }
}

function tryWrapper(func, args) {
  try {
    return Reflect.apply(func, this, args)
  } catch (e) {
    if (! isError(e) ||
        isStackTraceMasked(e)) {
      throw e
    }

    const [content] = args
    const isESM = e.sourceType === MODULE

    Reflect.deleteProperty(e, "sourceType")
    throw maskStackTrace(e, content, null, isESM)
  }
}

export default hook
