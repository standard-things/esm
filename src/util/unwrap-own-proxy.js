import OwnProxy from "../own/proxy.js"

import isObjectLike from "./is-object-like.js"
import shared from "../shared.js"

function init() {
  function unwrapOwnProxy(value) {
    if (! isObjectLike(value)) {
      return value
    }

    const cache = shared.memoize.utilUnwrapOwnProxy
    const cached = cache.get(value)

    if (cached !== void 0) {
      return cached
    }

    const { instances } = OwnProxy

    let details
    let unwrapped = value

    while ((details = instances.get(unwrapped)) !== void 0) {
      unwrapped = details[0]
    }

    cache.set(value, unwrapped)

    return unwrapped
  }

  return unwrapOwnProxy
}

export default shared.inited
  ? shared.module.utilUnwrapOwnProxy
  : shared.module.utilUnwrapOwnProxy = init()
