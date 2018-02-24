import OwnProxy from "../own/proxy.js"

import binding from "../binding.js"
import isObjectLike from "./is-object-like.js"
import shared from "../shared.js"

function getProxyDetails(proxy) {
  if (! isObjectLike(proxy)) {
    return
  }

  const details = OwnProxy.instances.get(proxy)

  if (details) {
    return [details[0], details[1]]
  }

  if (shared.support.getProxyDetails) {
    try {
      return binding.util.getProxyDetails(proxy)
    } catch (e) {}
  }
}

export default getProxyDetails
