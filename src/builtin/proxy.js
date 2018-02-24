import getDescriptor from "../util/get-descriptor.js"
import setDescriptor from "../util/set-descriptor.js"
import shared from "../shared.js"

function init() {
  function OwnProxy(target, handler) {
    const proxy = new Proxy(target, handler)
    shared.ownProxy.add(proxy)
    return proxy
  }

  setDescriptor(OwnProxy, "revocable", getDescriptor(Proxy, "revocable"))
  Object.setPrototypeOf(OwnProxy.prototype, null)

  return OwnProxy
}

export default shared.inited
  ? shared.builtin.Proxy
  : shared.builtin.Proxy = init()
