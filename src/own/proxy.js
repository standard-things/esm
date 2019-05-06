import setPrototypeOf from "../util/set-prototype-of.js"
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

      setPrototypeOf(handler, null)

      for (const name in handler) {
        toExternalFunction(handler[name])
      }

      Reflect.defineProperty(maskedHandler, shared.customInspectKey, customInspectDescriptor)
      Reflect.defineProperty(maskedHandler, shared.symbol.proxy, markerDescriptor)

      OwnProxy.instances.set(proxy, [target, maskedHandler])

      // Wrap `proxy` in a decoy proxy so that `proxy` will be used as the
      // unwrapped inspectable value.
      const emptyHandler = {}
      const decoyProxy = new Proxy(proxy, emptyHandler)

      OwnProxy.instances.set(decoyProxy, [proxy, emptyHandler])

      return decoyProxy
    }
  }

  setPrototypeOf(OwnProxy.prototype, null)

  return OwnProxy
}

export default shared.inited
  ? shared.module.OwnProxy
  : shared.module.OwnProxy = init()
