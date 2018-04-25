import getProxyDetails from "./get-proxy-details.js"
import isObjectLike from "./is-object-like.js"
import shared from "../shared.js"

function unwrapProxy(value) {
  const cache = shared.memoize.utilUnwrapProxy
  const cached = cache.get(value)

  if (cached) {
    return cached
  }

  let unwrapped = value

  if (isObjectLike(unwrapped)) {
    let details

    while ((details = getProxyDetails(unwrapped))) {
      unwrapped = details[0]
    }

    cache.set(value, unwrapped)
  }

  return unwrapped
}

export default unwrapProxy
