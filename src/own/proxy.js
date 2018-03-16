import ESM from "../constant/esm.js"

import assign from "../util/assign.js"
import shared from "../shared.js"

const {
  PKG_PREFIX
} = ESM

const markerDescriptor = {
  __proto__: null,
  value: true
}

function init() {
  const customInspect = () => "{}"

  class OwnProxy {
    static instances = new WeakMap

    constructor(target, handler) {
      const proto = assign({ __proto__: null }, handler)

      proto[shared.symbol.inspect] = customInspect
      handler = { __proto__: proto }
      Reflect.defineProperty(handler, PKG_PREFIX + ":proxy", markerDescriptor)

      const proxy = new Proxy(target, handler)

      OwnProxy.instances.set(proxy, [target, handler])
      return proxy
    }
  }

  Reflect.setPrototypeOf(OwnProxy.prototype, null)

  return OwnProxy
}

export default shared.inited
  ? shared.own.Proxy
  : shared.own.Proxy = init()
