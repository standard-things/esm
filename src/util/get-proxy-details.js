import OwnProxy from "../own/proxy.js"

import isObjectLike from "./is-object-like.js"
import realGetProxyDetails from "../real/get-proxy-details.js"
import shared from "../shared.js"

function init() {
  function getProxyDetails(proxy) {
    const cache = shared.memoize.utilGetProxyDetails
    const cached = cache.get(proxy)

    if (cached !== void 0) {
      return cached.details
    }

    if (! isObjectLike(proxy)) {
      return
    }

    const details =
      OwnProxy.instances.get(proxy) ||
      realGetProxyDetails(proxy)

    cache.set(proxy, { details })

    return details
  }

  return getProxyDetails
}

export default shared.inited
  ? shared.module.utilGetProxyDetails
  : shared.module.utilGetProxyDetails = init()
