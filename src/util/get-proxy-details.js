import OwnProxy from "../own/proxy.js"

import binding from "../binding.js"
import isObjectLike from "./is-object-like.js"
import shared from "../shared.js"

function getProxyDetails(proxy) {
  if (! isObjectLike(proxy)) {
    return
  }

  const cache = shared.memoize.getProxyDetails
  const cached = cache.get(proxy)

  if (cached) {
    return cached.details
  }

  let details = OwnProxy.instances.get(proxy)

  if (! details &&
      shared.support.getProxyDetails) {
    try {
      details = binding.util.getProxyDetails(proxy)
    } catch (e) {}
  }

  cache.set(proxy, {
    __proto__: null,
    details
  })

  return details
}

export default getProxyDetails
