import OwnProxy from "../own/proxy.js"

import isOwnProxy from "../util/is-own-proxy.js"
import proxyWrap from "../util/proxy-wrap.js"
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

      try {
        utilBinding.getProxyDetails = proxyWrap(_getProxyDetails, (_getProxyDetails, [value]) => {
          return getProxyDetails(value)
        })

        cache.set(utilBinding, true)
      } catch {}

      return context
    }
  }

  function check(utilBinding, getProxyDetails, cache) {
    if (! utilBinding ||
        typeof getProxyDetails !== "function") {
      return true
    }

    let result = cache.get(utilBinding)

    if (typeof result === "boolean") {
      return result
    }

    result = true

    try {
      const object = {}
      const proxy = new OwnProxy(object, object)

      result = getProxyDetails(proxy) === void 0
    } catch {}

    cache.set(utilBinding, result)
    return result
  }

  return Shim
}

export default shared.inited
  ? shared.module.shimProcessBindingUtilGetProxyDetails
  : shared.module.shimProcessBindingUtilGetProxyDetails = init()
