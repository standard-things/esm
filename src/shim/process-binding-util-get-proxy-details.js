import OwnProxy from "../own/proxy.js"

import isOwnProxy from "../util/is-own-proxy.js"
import nativeTrap from "../util/native-trap.js"
import setProperty from "../util/set-property.js"
import shared from "../shared.js"
import silent from "../util/silent.js"

function init() {
  const Shim = {
    enable(context) {
      const cache = shared.memoize.shimProcessBindingUtilGetProxyDetails

      let _getProxyDetails
      let utilBinding

      silent(() => {
        try {
          utilBinding = context.process.binding("util")
          _getProxyDetails = utilBinding.getProxyDetails
        } catch {}
      })

      if (check(utilBinding, _getProxyDetails, cache)) {
        return context
      }

      const getProxyDetails = (value) => {
        return isOwnProxy(value)
          ? void 0
          : Reflect.apply(_getProxyDetails, utilBinding, [value])
      }

      const trap = nativeTrap((_getProxyDetails, ...rest) => {
        const [value] = rest[rest.length - 1]

        return getProxyDetails(value)
      })

      const proxy = new OwnProxy(_getProxyDetails, {
        apply: trap,
        construct: trap
      })

      if (setProperty(utilBinding, "getProxyDetails", proxy)) {
        cache.set(utilBinding, true)
      }

      return context
    }
  }

  function check(utilBinding, getProxyDetails, cache) {
    if (! utilBinding ||
        typeof getProxyDetails !== "function") {
      return true
    }

    let cached = cache.get(utilBinding)

    if (cached !== void 0) {
      return cached
    }

    cached = true

    try {
      const object = {}
      const proxy = new OwnProxy(object, object)

      cached = getProxyDetails(proxy) === void 0
    } catch {}

    cache.set(utilBinding, cached)

    return cached
  }

  return Shim
}

export default shared.inited
  ? shared.module.shimProcessBindingUtilGetProxyDetails
  : shared.module.shimProcessBindingUtilGetProxyDetails = init()
