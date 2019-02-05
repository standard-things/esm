import COMPILER from "../constant/compiler.js"
import ENTRY from "../constant/entry.js"
import ENV from "../constant/env.js"

import CachingCompiler from "../caching-compiler.js"
import Entry from "../entry.js"
import GenericObject from "../generic/object.js"
import Loader from "../loader.js"
import Module from "../module.js"
import Package from "../package.js"
import { REPLServer } from "../safe/repl.js"
import Runtime from "../runtime.js"
import Wrapper from "../wrapper.js"

import acornInternalAcorn from "../acorn/internal/acorn.js"
import acornInternalWalk from "../acorn/internal/walk.js"
import assign from "../util/assign.js"
import getCacheName from "../util/get-cache-name.js"
import getSilent from "../util/get-silent.js"
import inspect from "../util/inspect.js"
import isStackTraceMaskable from "../util/is-stack-trace-maskable.js"
import makeRequireFunction from "../module/internal/make-require-function.js"
import maskStackTrace from "../error/mask-stack-trace.js"
import proxyWrap from "../util/proxy-wrap.js"
import realUtil from "../real/util.js"
import rootModule from "../root-module.js"
import setGetter from "../util/set-getter.js"
import setProperty from "../util/set-property.js"
import setPrototypeOf from "../util/set-prototype-of.js"
import setSetter from "../util/set-setter.js"
import shared from "../shared.js"
import wrap from "../util/wrap.js"

const {
  SOURCE_TYPE_UNAMBIGUOUS
} = COMPILER

const {
  STATE_EXECUTION_COMPLETED,
  STATE_EXECUTION_STARTED
} = ENTRY

const {
 CHECK,
 EVAL,
 FLAGS,
 HAS_INSPECTOR,
 INTERNAL,
 REPL
} = ENV

function hook(vm) {
  let entry

  function managerWrapper(manager, createScript, args) {
    const wrapped = Wrapper.find(vm, "createScript", "*")

    return Reflect.apply(wrapped, this, [manager, createScript, args])
  }

  function methodWrapper(manager, createScript, [content, scriptOptions]) {
    scriptOptions = assign({}, scriptOptions)
    scriptOptions.produceCachedData = true

    const cacheName = getCacheName(content)
    const compileDatas = entry.package.cache.compile
    const { runtimeName } = entry

    let compileData = Reflect.has(compileDatas, cacheName)
      ? compileDatas[cacheName]
      : null

    if (compileData === null) {
      const compilerOptions = {
        cjsVars: true,
        generateVarDeclarations: true,
        pragmas: false,
        runtimeName,
        sourceType: SOURCE_TYPE_UNAMBIGUOUS,
        strict: false
      }

      compileData = tryWrapper(CachingCompiler.compile, [content, compilerOptions], content)
      compileDatas[cacheName] = compileData
    } else if (compileData.scriptData !== null &&
        scriptOptions.produceCachedData &&
        ! Reflect.has(scriptOptions, "cachedData")) {
      scriptOptions.cachedData = compileData.scriptData
    }

    const code =
      "(()=>{" +
        'var g=Function("return this")(),' +
        "m=g.module," +
        "e=m&&m.exports," +
        'n="' + runtimeName + '";' +
        "if(e&&!g[n]){" +
          "m.exports=e.entry.exports;" +
          "require=e.entry.require;" +
          "e.entry.addBuiltinModules(g);" +
          "Reflect.defineProperty(g,n,{" +
            "__proto__:null," +
            "value:e" +
          "})" +
        "}" +
      "})();" +
      compileData.code

    const runInWrapper = function (runInFunc, args) {
      entry._validation.clear()
      entry.cacheName = cacheName
      entry.compileData = compileData
      entry.state = STATE_EXECUTION_STARTED

      const result = tryWrapper.call(this, runInFunc, args, content)

      entry.state = STATE_EXECUTION_COMPLETED

      return result
    }

    const script = tryWrapper.call(vm, createScript, [code, scriptOptions], content)

    if (script.cachedDataProduced) {
      compileData.scriptData = script.cachedData
    }

    script.runInContext = wrap(script.runInContext, runInWrapper)
    script.runInThisContext = wrap(script.runInThisContext, runInWrapper)

    return script
  }

  function setupCheck() {
    vm.Script = proxyWrap(vm.Script, (Script, [code, options]) => {
      vm.Script = Script

      const wrapper = getSilent(Module, "wrapper")

      if (Array.isArray(wrapper)) {
        const [prefix, suffix] = wrapper

        if (typeof prefix === "string" &&
            typeof suffix === "string") {
          code = code.slice(prefix.length, -suffix.length)
        }
      }

      setupEntry(rootModule)
      return vm.createScript(code, options)
    })
  }

  function setupEntry(mod) {
    entry = Entry.get(mod)
    entry.addBuiltinModules = createAddBuiltinModules(entry)
    entry.package = Package.get("")
    entry.require = makeRequireFunction(mod)
    entry.runtime = null
    entry.runtimeName = shared.runtimeName

    setPrototypeOf(mod, Module.prototype)
    Runtime.enable(entry, GenericObject.create())
  }

  function setupEval() {
    vm.runInThisContext = proxyWrap(vm.runInThisContext, (runInThisContext, [code, options]) => {
      vm.runInThisContext = runInThisContext
      setupEntry(shared.unsafeGlobal.module)
      return vm.createScript(code, options).runInThisContext(options)
    })
  }

  function setupREPL() {
    const { createContext } = REPLServer.prototype

    if (rootModule.id === "<repl>") {
      setupEntry(rootModule)
    } else if (typeof createContext === "function") {
      REPLServer.prototype.createContext = proxyWrap(createContext, function () {
        REPLServer.prototype.createContext = createContext

        const context = Reflect.apply(createContext, this, [])

        setupEntry(context.module)
        return context
      })
    }

    if (INTERNAL &&
        FLAGS.experimentalREPLAwait) {
      acornInternalAcorn.enable()
      acornInternalWalk.enable()
    }

    // Exit for Node 10+.
    if (shared.support.replShowProxy) {
      realUtil.inspect = inspect
      return
    }

    const _inspect = realUtil.inspect

    setGetter(realUtil, "inspect", function () {
      // The first get occurs in Node's lib/repl.js as an assignment to
      // `repl.writer()`. It needs to be the original `util.inspect()`
      // for ANSI coloring to be enabled.
      // https://github.com/nodejs/node/blob/v9.11.1/lib/repl.js#L377-L382
      this.inspect = inspect
      return _inspect
    })

    setSetter(realUtil, "inspect", function (value) {
      setProperty(this, "inspect", value)
    })
  }

  Wrapper.manage(vm, "createScript", managerWrapper)
  Wrapper.wrap(vm, "createScript", methodWrapper)

  if (CHECK) {
    setupCheck()
  } else if (EVAL)  {
    setupEval()
  } else if (REPL) {
    setupREPL()
  }
}

function createAddBuiltinModules(entry) {
  const lazyModules = [
    "assert", "async_hooks", "buffer", "child_process", "cluster", "crypto",
    "dgram", "dns", "domain", "events", "fs", "http", "http2", "https", "net",
    "os", "path", "perf_hooks", "punycode", "querystring", "readline", "repl",
    "stream", "string_decoder", "tls", "tty", "url", "util", "v8", "vm", "zlib"
  ]

  const { length } = lazyModules

  if (HAS_INSPECTOR) {
    lazyModules.push("inspector")
  }

  if (FLAGS.experimentalWorker) {
    lazyModules.push("worker_threads")
  }

  if (lazyModules.length !== length) {
    lazyModules.sort()
  }

  return function addBuiltinModules(context) {
    const req = entry.require

    Reflect.defineProperty(context, "console", {
      configurable: true,
      value: req("console"),
      writable: true
    })

    Reflect.defineProperty(context, "process", {
      configurable: true,
      value: req("process"),
      writable: true
    })

    for (const name of lazyModules) {
      const set = function (value) {
        setProperty(this, name, value)
      }

      Reflect.defineProperty(context, name, {
        configurable: true,
        get() {
          this[name] = void 0

          const exported = req(name)

          Reflect.defineProperty(this, name, {
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
}

function tryWrapper(func, args, content) {
  let error

  try {
    return Reflect.apply(func, this, args)
  } catch (e) {
    error = e
  }

  if (! Loader.state.package.default.options.debug &&
      isStackTraceMaskable(error)) {
    maskStackTrace(error, { content })
  }

  throw error
}

export default hook
