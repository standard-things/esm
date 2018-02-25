import PREFIX from "../constant/prefix.js"

import shared from "../shared.js"
import toNullObject from "../util/to-null-object.js"

const {
  STD_ESM
} = PREFIX

function init() {
  const customInspect = () => "{}"

  class OwnProxy {
    static instances = new WeakMap

    constructor(target, handler) {
      const proto = toNullObject(handler)
      proto[shared.symbol.inspect] = customInspect
      handler = { __proto__: proto, [STD_ESM + ":proxy"]: 1 }

      const proxy = new Proxy(target, handler)
      OwnProxy.instances.set(proxy, [target, handler])
      return proxy
    }
  }

  Object.setPrototypeOf(OwnProxy.prototype, null)

  return OwnProxy
}

export default shared.inited
  ? shared.own.Proxy
  : shared.own.Proxy = init()
