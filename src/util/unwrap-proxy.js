import getProxyDetails from "./get-proxy-details.js"
import shared from "../shared.js"

function unwrapProxy(value) {
  const cache = shared.unwrapProxy
  const cached = cache.get(value)

  if (cached) {
    return cached
  }

  let details
  let unwrapped = value

  while ((details = getProxyDetails(unwrapped))) {
    unwrapped = details[0]
  }

  cache.set(value, unwrapped)
  return unwrapped
}

export default unwrapProxy
