import isObjectLike from "./is-object-like.js"
import isOwnProxy from "./is-own-proxy.js"
import shared from "../shared.js"
import unwrapProxy from "./unwrap-proxy.js"

function init() {
  function unwrapOwnProxy(value) {
    if (! isObjectLike(value)) {
      return value
    }

    const cache = shared.memoize.utilUnwrapOwnProxy
    const cached = cache.get(value)

    if (cached) {
      return cached
    }

    const unwrapped = isOwnProxy(value)
      ? unwrapProxy(value)
      : value

    cache.set(value, unwrapped)
    return unwrapped
  }

  return unwrapOwnProxy
}

export default shared.inited
  ? shared.module.utilUnwrapOwnProxy
  : shared.module.utilUnwrapOwnProxy = init()
