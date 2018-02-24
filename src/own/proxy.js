import shared from "../shared.js"
import toNullObject from "../util/to-null-object.js"

function init() {
  class OwnProxy {
    static instances = new WeakSet

    constructor(target, handler) {
      handler = toNullObject(handler)
      handler["@std/esm"] = 1

      const proxy = new Proxy(target, handler)
      OwnProxy.instances.add(proxy)
      return proxy
    }
  }

  Object.setPrototypeOf(OwnProxy.prototype, null)

  return OwnProxy
}

export default shared.inited
  ? shared.own.Proxy
  : shared.own.Proxy = init()
