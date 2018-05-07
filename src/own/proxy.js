import ESM from "../constant/esm.js"

import assign from "../util/assign.js"
import shared from "../shared.js"

function init() {
  const {
    PKG_PREFIX
  } = ESM

  const customInspectDescriptor = {
    __proto__: null,
    value: () => "{}"
  }

  const markerDescriptor = {
    __proto__: null,
    value: 1
  }

  const funcToStringTagDescriptor = {
    __proto__: null,
    configurable: true,
    value: "Function",
    writable: true
  }

  class OwnProxy {
    static instances = new WeakMap

    constructor(target, handler) {
      const proto = assign({ __proto__: null }, handler)

      handler = { __proto__: proto }

      Reflect.defineProperty(proto, shared.customInspectKey, customInspectDescriptor)
      Object.freeze(proto)

      Reflect.defineProperty(handler, PKG_PREFIX + ":proxy", markerDescriptor)
      Object.freeze(handler)

      const proxy = new Proxy(target, handler)

      if (typeof target === "function" &&
          ! shared.support.proxiedFunctionToStringTag) {
        Reflect.defineProperty(proxy, Symbol.toStringTag, funcToStringTagDescriptor)
      }

      OwnProxy.instances.set(proxy, Object.freeze([target, handler]))
      return proxy
    }
  }

  Reflect.setPrototypeOf(OwnProxy.prototype, null)

  return OwnProxy
}

export default shared.inited
  ? shared.module.OwnProxy
  : shared.module.OwnProxy = init()
