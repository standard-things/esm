import ESM from "./constant/esm.js"

import encodeId from "./util/encode-id.js"
import setDeferred from "./util/set-deferred.js"

const {
  PKG_PREFIX
} = ESM

const SHARED_SYMBOL = Symbol.for(PKG_PREFIX + ":shared")

function getShared() {
  if (__shared__) {
    __shared__.inited = true
    return __shared__
  }

  try {
    const shared = __non_webpack_require__(SHARED_SYMBOL)
    shared.inited = false
    return shared
  } catch (e) {}

  return init()
}

function init() {
  const dummyProxy = new Proxy(class P {}, {
    __proto__: null,
    [PKG_PREFIX]: 1
  })

  const funcToString = Function.prototype.toString
  const { toString } = Object.prototype

  const fastPath = { __proto__: null }
  const utilBinding = { __proto__: null }

  const support = {
    __proto__: null,
    wasm: typeof WebAssembly === "object" && WebAssembly !== null
  }

  const symbol = {
    __proto__: null,
    _compile: Symbol.for(PKG_PREFIX + ":module._compile"),
    mjs: Symbol.for(PKG_PREFIX + ':Module._extensions[".mjs"]'),
    package: Symbol.for(PKG_PREFIX + ":package"),
    realGetProxyDetails: Symbol.for(PKG_PREFIX + ":realGetProxyDetails"),
    realRequire: Symbol.for(PKG_PREFIX + ":realRequire"),
    shared: SHARED_SYMBOL,
    wrapper: Symbol.for(PKG_PREFIX + ":wrapper")
  }

  const shared = {
    __proto__: null,
    entry: {
      __proto__: null,
      cache: new WeakMap,
      skipExports: { __proto__: null }
    },
    env: { __proto__: null },
    external: __external__,
    fastPath,
    inited: false,
    memoize: {
      __proto__: null,
      moduleCJSResolveFilename: { __proto__: null },
      moduleESMResolveFilename: { __proto__: null },
      moduleFindPath: { __proto__: null },
      moduleReadPackage: { __proto__: null },
      shimFunctionPrototypeToString: new WeakMap,
      shimProcessBindingUtilGetProxyDetails: new WeakMap,
      utilGetProxyDetails: new WeakMap,
      utilIsMJS: { __proto__: null },
      utilMaskFunction: new WeakMap,
      utilMaxSatisfying: { __proto__: null },
      utilParseURL: { __proto__: null },
      utilProxyExports: new WeakMap,
      utilSatisfies: { __proto__: null },
      utilUnwrapProxy: new WeakMap
    },
    module: { __proto__: null },
    moduleState: {
      __proto__: null,
      parseOnly: false,
      parsing: false,
      requireDepth: 0,
      stat: null
    },
    package: {
      __proto__: null,
      default: null,
      dir: { __proto__: null },
      root: { __proto__: null },
      state: { __proto__: null }
    },
    pendingMetas: { __proto__: null },
    pendingWrites: { __proto__: null },
    safeContext: Function("return this")(),
    support,
    symbol,
    unsafeContext: global,
    utilBinding
  }

  setDeferred(shared, "customInspectKey", () => {
    const customInspectSymbol = shared.module.safeUtil.inspect.custom

    return typeof customInspectSymbol === "symbol"
      ? customInspectSymbol
      : "inspect"
  })

  setDeferred(shared, "proxyNativeSourceText", () => {
    try {
      return funcToString.call(dummyProxy)
    } catch (e) {}

    return ""
  })

  setDeferred(shared, "runtimeName", () =>
    encodeId(
      "_" +
      shared.module.safeCrypto.createHash("md5")
        .update(Date.now().toString())
        .digest("hex")
        .slice(0, 3)
    )
  )

  setDeferred(fastPath, "readFile", () =>
    support.internalModuleReadFile
  )

  setDeferred(fastPath, "readFileFast", () =>
    support.internalModuleReadJSON ||
      support.internalModuleReadFile
  )

  setDeferred(fastPath, "stat", () =>
    typeof shared.module.binding.fs.internalModuleStat === "function"
  )

  setDeferred(support, "await", () => {
    try {
      Function("async()=>await 1")()
      return true
    } catch (e) {}

    return false
  })

  setDeferred(support, "getProxyDetails", () =>
    typeof shared.module.binding.util.getProxyDetails === "function"
  )

  setDeferred(support, "inspectProxies", () => {
    const inspected = shared.module.safeUtil.inspect(dummyProxy, {
      __proto__: null,
      depth: 1,
      showProxy: true
    })

    return inspected.startsWith("Proxy") &&
      inspected.indexOf(PKG_PREFIX) !== -1
  })

  setDeferred(support, "internalModuleReadFile", () =>
    typeof shared.module.binding.fs.internalModuleReadFile === "function"
  )

  setDeferred(support, "internalModuleReadJSON", () =>
    typeof shared.module.binding.fs.internalModuleReadJSON === "function"
  )

  setDeferred(support, "nativeProxyReceiver", () => {
    // Detect support for invoking native functions with a proxy receiver.
    // https://bugs.chromium.org/p/v8/issues/detail?id=5773
    const { safeProcess } = shared.module
    const { cwd } = safeProcess
    const proxy = new Proxy(safeProcess, { __proto__: null })

    try {
      Reflect.apply(cwd, proxy, [])
      return true
    } catch (e) {}

    return false
  })

  setDeferred(support, "proxiedClasses", () => {
    class C extends dummyProxy {
      c() {}
    }

    return new C().c !== void 0
  })

  setDeferred(support, "proxiedFunctionToStringTag", () =>
    toString.call(dummyProxy) === "[object Function]"
  )

  setDeferred(support, "replShowProxy", () => {
    const { safeProcess, utilSatisfies } = shared.module

    return utilSatisfies(safeProcess.version, ">=10")
  })

  setDeferred(support, "safeGetEnv", () =>
    typeof shared.module.binding.util.safeGetenv === "function"
  )

  setDeferred(support, "setHiddenValue", () =>
    typeof shared.module.binding.util.setHiddenValue === "function"
  )

  setDeferred(utilBinding, "errorDecoratedSymbol", () => {
    const { binding, safeProcess, utilSatisfies } = shared.module

    return utilSatisfies(safeProcess.version, "<7")
      ? "node:decorated"
      : binding.util.decorated_private_symbol
  })

  setDeferred(utilBinding, "hiddenKeyType", () => {
    const { safeProcess, utilSatisfies } = shared.module

    return utilSatisfies(safeProcess.version, "<7")
      ? "string"
      : typeof utilBinding.errorDecoratedSymbol
  })

  return shared
}

export default getShared()
