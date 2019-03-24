import OwnProxy from "../own/proxy.js"

import emptyObject from "../util/empty-object.js"
import isObjectLike from "../util/is-object-like.js"
import isOwnProxy from "../util/is-own-proxy.js"
import nativeTrap from "../util/native-trap.js"
import setProperty from "../util/set-property.js"
import shared from "../shared.js"
import silent from "../util/silent.js"

function init() {
  const Shim = {
    enable(context) {
      const cache = shared.memoize.shimProcessBindingUtilGetProxyDetails

      let getProxyDetails
      let utilBinding

      silent(() => {
        try {
          utilBinding = context.process.binding("util")
          getProxyDetails = utilBinding.getProxyDetails
        } catch {}
      })

      if (check(utilBinding, getProxyDetails, cache)) {
        return context
      }

      const trap = nativeTrap((getProxyDetails, ...rest) => {
        const [value] = rest[rest.length - 1]

        if (! isOwnProxy(value)) {
          return Reflect.apply(getProxyDetails, utilBinding, [value])
        }
      })

      if (setProperty(utilBinding, "getProxyDetails", new OwnProxy(getProxyDetails, {
            apply: trap,
            construct: trap
          }))) {
        cache.set(utilBinding, true)
      }

      return context
    }
  }

  function check(utilBinding, getProxyDetails, cache) {
    if (! isObjectLike(utilBinding) ||
        typeof getProxyDetails !== "function") {
      return true
    }

    let cached = cache.get(utilBinding)

    if (cached !== void 0) {
      return cached
    }

    cached = true

    try {
      cached = getProxyDetails(new OwnProxy(emptyObject, emptyObject)) === void 0
    } catch {}

    cache.set(utilBinding, cached)

    return cached
  }

  return Shim
}

export default shared.inited
  ? shared.module.shimProcessBindingUtilGetProxyDetails
  : shared.module.shimProcessBindingUtilGetProxyDetails = init()
