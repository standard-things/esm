import OwnProxy from "../own/proxy.js"

import isObjectLike from "./is-object-like.js"
import realGetProxyDetails from "../real/get-proxy-details.js"
import shared from "../shared.js"

function init() {
  function getProxyDetails(proxy) {
    const cache = shared.memoize.utilGetProxyDetails
    const cached = cache.get(proxy)

    if (cached) {
      return cached.details
    }

    if (! isObjectLike(proxy)) {
      return
    }

    let details = OwnProxy.instances.get(proxy)

    if (realGetProxyDetails &&
        ! details) {
      try {
        details = realGetProxyDetails(proxy)
      } catch (e) {}
    }

    cache.set(proxy, { details })

    return details
  }

  return getProxyDetails
}

export default shared.inited
  ? shared.module.utilGetProxyDetails
  : shared.module.utilGetProxyDetails = init()
