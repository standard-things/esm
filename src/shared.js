import ESM from "./constant/esm.js"

import encodeId from "./util/encode-id.js"
import satisfies from "./util/satisfies.js"
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
      parsing: false,
      passthru: false,
      requireDepth: 0,
      stat: null
    },
    package: {
      __proto__: null,
      cache: { __proto__: null },
      default: null,
      dir: { __proto__: null },
      root: { __proto__: null }
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
    const customInspectSymbol = symbol.customInspect

    return typeof customInspectSymbol === "symbol"
      ? customInspectSymbol
      : "inspect"
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
    const proxy = new Proxy({ __proto__: null }, {
      __proto__: null,
      [PKG_PREFIX]: 1
    })

    const inspected = shared.module.safeUtil.inspect(proxy, {
      __proto__: null,
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

  setDeferred(support, "internalModuleReadJSON", () => {
    const { types } = shared.module.safeUtil

    return typeof (types && types.isProxy) === "function"
  })

  setDeferred(support, "proxiedClasses", () => {
    class A {}

    Reflect.setPrototypeOf(A.prototype, null)

    const proxy = new Proxy(A, { __proto__: null })

    class B extends proxy {
      b() {}
    }

    Reflect.setPrototypeOf(B.prototype, null)

    return new B().b !== void 0
  })

  setDeferred(support, "proxiedFunctionToStringTag", () => {
    const { toString } = Object.prototype
    const proxy = new Proxy(toString, { __proto__: null })

    return toString.call(proxy) === "[object Function]"
  })

  setDeferred(support, "replShowProxy", () =>
    satisfies(shared.module.safeProcess.version, ">=10")
  )

  setDeferred(support, "safeGetEnv", () =>
    typeof shared.module.binding.util.safeGetenv === "function"
  )

  setDeferred(support, "safeToString", () =>
    typeof shared.module.binding.util.safeToString === "function"
  )

  setDeferred(support, "setHiddenValue", () =>
    typeof shared.module.binding.util.setHiddenValue === "function"
  )

  setDeferred(symbol, "customInspect", () =>
    shared.module.safeUtil.inspect.custom
  )

  setDeferred(utilBinding, "errorDecoratedSymbol", () =>
    satisfies(shared.module.safeProcess.version, "<7")
      ? "node:decorated"
      : shared.module.binding.util.decorated_private_symbol
  )

  setDeferred(utilBinding, "hiddenKeyType", () =>
    satisfies(shared.module.safeProcess.version, "<7")
      ? "string"
      : typeof utilBinding.errorDecoratedSymbol
  )

  return shared
}

export default getShared()
