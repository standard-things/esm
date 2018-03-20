import OwnProxy from "../own/proxy.js"

import call from "../util/call.js"
import isOwnProxy from "../util/is-own-proxy.js"
import realGetProxyDetails from "../real/get-proxy-details.js"
import shared from "../shared.js"
import silent from "../util/silent.js"

function init() {
  const Shim = {
    __proto__: null,
    enable(context) {
      const cache = shared.memoize.shimProcessBindingUtilGetProxyDetails

      let utilBinding

      try {
        utilBinding = silent(() => context.process.binding("util"))
      } catch (e) {}

      if (check(utilBinding, cache)) {
        return context
      }

      const _getProxyDetails = utilBinding.getProxyDetails

      const getProxyDetails = function (value) {
        if (value === shared.symbol.getProxyDetails) {
          return realGetProxyDetails
        }

        return isOwnProxy(value)
          ? void 0
          : call(_getProxyDetails, utilBinding, value)
      }

      getProxyDetails.prototype = _getProxyDetails.prototype

      try {
        if (! shared.support.proxiedFunctions) {
          utilBinding.getProxyDetails = getProxyDetails
          return
        }

        utilBinding.getProxyDetails = new OwnProxy(_getProxyDetails, {
          apply(target, thisArg, args) {
            return Reflect.apply(getProxyDetails, thisArg, args)
          }
        })

        cache.set(utilBinding, true)
      } catch (e) {}

      return context
    }
  }

  function check(utilBinding, cache) {
    if (! utilBinding) {
      return true
    }

    let result = cache.get(utilBinding)

    if (typeof result === "boolean") {
      return result
    }

    result = false

    try {
      const { getProxyDetails } = utilBinding
      const proxy = new OwnProxy(getProxyDetails)

      result = getProxyDetails(proxy) === void 0
    } catch (e) {}

    cache.set(utilBinding, result)
    return result
  }

  return Shim
}

export default shared.inited
  ? shared.module.shimProcessBindingUtilGetProxyDetails
  : shared.module.shimProcessBindingUtilGetProxyDetails = init()
