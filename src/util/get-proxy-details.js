import OwnProxy from "../own/proxy.js"

import isObjectLike from "./is-object-like.js"
import realGetProxyDetails from "../real/get-proxy-details.js"
import shared from "../shared.js"

function getProxyDetails(proxy) {
  if (! isObjectLike(proxy)) {
    return
  }

  const cache = shared.memoize.utilGetProxyDetails
  const cached = cache.get(proxy)

  if (cached) {
    return cached.details
  }

  let details = OwnProxy.instances.get(proxy)

  if (! details &&
      shared.support.getProxyDetails) {
    try {
      details = realGetProxyDetails(proxy)
    } catch (e) {}
  }

  cache.set(proxy, {
    __proto__: null,
    details
  })

  return details
}

export default getProxyDetails
