import ESM from "./constant/esm.js"

import encodeId from "./util/encode-id.js"
import setDeferred from "./util/set-deferred.js"

const {
  PKG_PREFIX,
  PKG_VERSION
} = ESM

const SHARED_SYMBOL = Symbol.for(PKG_PREFIX + "@" + PKG_VERSION + ":shared")

function getShared() {
  if (__shared__) {
    __shared__.inited = true
    __shared__.reloaded = false
    return __shared__
  }

  try {
    const shared = __non_webpack_require__(SHARED_SYMBOL)

    shared.reloaded = true

    // eslint-disable-next-line no-global-assign
    return __shared__ = shared
  } catch {}

  return init()
}

function init() {
  const dummyProxy = new Proxy(class P {}, {
    [PKG_PREFIX]: 1
  })

  const funcToString = Function.prototype.toString

  const support = {
    wasm: typeof WebAssembly === "object" && WebAssembly !== null
  }

  const symbol = {
    _compile: Symbol.for(PKG_PREFIX + ":module._compile"),
    mjs: Symbol.for(PKG_PREFIX + ':Module._extensions[".mjs"]'),
    namespace: Symbol.for(PKG_PREFIX + ":namespace"),
    package: Symbol.for(PKG_PREFIX + ":package"),
    realGetProxyDetails: Symbol.for(PKG_PREFIX + ":realGetProxyDetails"),
    realRequire: Symbol.for(PKG_PREFIX + ":realRequire"),
    shared: SHARED_SYMBOL,
    wrapper: Symbol.for(PKG_PREFIX + ":wrapper")
  }

  const utilBinding = {}

  const shared = {
    entry: {
      cache: new WeakMap,
      skipExports: { __proto__: null }
    },
    env: {},
    external: __external__,
    inited: false,
    memoize: {
      builtinEntries: { __proto__: null },
      builtinModules: { __proto__: null },
      fsRealpath: { __proto__: null },
      moduleESMResolveFilename: { __proto__: null },
      moduleInternalFindPath: { __proto__: null },
      moduleInternalReadPackage: { __proto__: null },
      moduleStaticResolveFilename: { __proto__: null },
      shimFunctionPrototypeToString: new WeakMap,
      shimProcessBindingUtilGetProxyDetails: new WeakMap,
      utilGetProxyDetails: new WeakMap,
      utilMaskFunction: new WeakMap,
      utilMaxSatisfying: { __proto__: null },
      utilParseURL: { __proto__: null },
      utilProxyExports: new WeakMap,
      utilSatisfies: { __proto__: null },
      utilUnwrapOwnProxy: new WeakMap,
      utilUnwrapProxy: new WeakMap
    },
    module: {},
    moduleState: {
      instantiating: false,
      parsing: false,
      requireDepth: 0,
      statFast: null,
      statSync: null
    },
    package: {
      dir: { __proto__: null },
      root: { __proto__: null },
      state: { __proto__: null }
    },
    pendingScripts: { __proto__: null },
    pendingWrites: { __proto__: null },
    reloaded: false,
    safeGlobal: __global__,
    support,
    symbol,
    unsafeGlobal: global,
    utilBinding
  }

  setDeferred(shared, "circularErrorMessage", () => {
    try {
      const object = {}

      object.a = object
      JSON.stringify(object)
    } catch ({ message }) {
      return message
    }
  })

  setDeferred(shared, "customInspectKey", () => {
    const { safeUtil } = shared.module
    const { customInspectSymbol } = safeUtil

    return typeof customInspectSymbol === "symbol"
      ? customInspectSymbol
      : "inspect"
  })

  setDeferred(shared, "defaultGlobal", () => {
    const { safeVM } = shared.module

    return new safeVM.Script("this").runInThisContext()
  })

  setDeferred(shared, "originalConsole", () => {
    const {
      safeInspector,
      safeVM
    } = shared.module

    return (safeInspector && safeInspector.console) ||
      new safeVM.Script("console").runInNewContext()
  })

  setDeferred(shared, "proxyNativeSourceText", () => {
    // Node < 10 doesn't support `Function#toString()` of proxied functions.
    // https://node.green/#ESNEXT-candidate--stage-3--Function-prototype-toString-revision
    try {
      return typeof funcToString.call(dummyProxy) === "string"
    } catch {}

    return ""
  })

  setDeferred(shared, "runtimeName", () => {
    const { safeCrypto } =  shared.module

    return encodeId(
      "_" +
      safeCrypto.createHash("md5")
        .update(Date.now().toString())
        .digest("hex")
        .slice(0, 3)
    )
  })

  setDeferred(shared, "unsafeContext", () => {
    const {
      safeVM,
      utilPrepareContext
    } = shared.module

    return utilPrepareContext(safeVM.createContext(shared.unsafeGlobal))
  })

  setDeferred(support, "await", () => {
    const { safeVM } = shared.module

    try {
      new safeVM.Script("async()=>await 1").runInThisContext()
      return true
    } catch {}

    return false
  })

  setDeferred(support, "createCachedData", () => {
    const { safeVM } = shared.module

    return typeof safeVM.Script.prototype.createCachedData === "function"
  })

  setDeferred(support, "inspectProxies", () => {
    const { safeUtil } = shared.module

    // Node < 6.1.0 does not support inspecting proxies.
    const inspected = safeUtil.inspect(dummyProxy, {
      depth: 1,
      showProxy: true
    })

    return inspected.indexOf("Proxy") !== -1 &&
      inspected.indexOf(PKG_PREFIX) !== -1
  })

  setDeferred(support, "lookupShadowed", () => {
    // Node < 8 will lookup accessors in the prototype chain
    // despite being shadowed by data properties.
    // https://node.green/#ES2017-annex-b
    const object = {
      __proto__: {
        // eslint-disable-next-line getter-return
        get a() {},
        set a(v) {}
      },
      a: 1
    }

    return ! object.__lookupGetter__("a") &&
      ! object.__lookupSetter__("a")
  })

  setDeferred(support, "nativeProxyReceiver", () => {
    const { SafeBuffer } = shared.module

    // Detect support for invoking native functions with a proxy receiver.
    // https://bugs.chromium.org/p/v8/issues/detail?id=5773
    try {
      const proxy = new Proxy(SafeBuffer.alloc(0), {
        get: (target, name) => target[name]
      })

      // Return a result so the test has a side effect and won't be removed by
      // Uglify's "unsafe" option.
      // https://github.com/mishoo/UglifyJS2#the-unsafe-compress-option
      return typeof proxy.toString() === "string"
    } catch (e) {
      return ! /Illegal/.test(e)
    }
  })

  setDeferred(support, "replShowProxy", () => {
    const {
      safeProcess,
      utilSatisfies
    } = shared.module

    return utilSatisfies(safeProcess.version, ">=10")
  })

  setDeferred(utilBinding, "errorDecoratedSymbol", () => {
    const {
      binding,
      safeProcess,
      utilSatisfies
    } = shared.module

    return utilSatisfies(safeProcess.version, "<7")
      ? "node:decorated"
      : binding.util.decorated_private_symbol
  })

  setDeferred(utilBinding, "hiddenKeyType", () => {
    const {
      safeProcess,
      utilSatisfies
    } = shared.module

    return utilSatisfies(safeProcess.version, "<7")
      ? "string"
      : typeof utilBinding.errorDecoratedSymbol
  })

  // eslint-disable-next-line no-global-assign
  return __shared__ = shared
}

export default getShared()
