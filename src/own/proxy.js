import shared from "../shared.js"
import toExternalFunction from "../util/to-external-function.js"

function init() {
  const customInspectDescriptor = {
    value: toExternalFunction(() => "{}")
  }

  const markerDescriptor = {
    value: 1
  }

  class OwnProxy {
    // TODO: Remove this eslint comment when the false positive is resolved.
    // eslint-disable-next-line no-undef
    static instances = new WeakMap

    constructor(target, handler) {
      const maskedHandler = { __proto__: handler }
      const proxy = new Proxy(target, maskedHandler)

      Reflect.setPrototypeOf(handler, null)
      Reflect.defineProperty(maskedHandler, shared.customInspectKey, customInspectDescriptor)
      Reflect.defineProperty(maskedHandler, shared.symbol.proxy, markerDescriptor)

      for (const name in handler) {
        toExternalFunction(handler[name])
      }

      OwnProxy.instances.set(proxy, [target, maskedHandler])

      return proxy
    }
  }

  Reflect.setPrototypeOf(OwnProxy.prototype, null)

  return OwnProxy
}

export default shared.inited
  ? shared.module.OwnProxy
  : shared.module.OwnProxy = init()
