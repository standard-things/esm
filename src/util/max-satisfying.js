import { maxSatisfying as _maxSatisfying } from "semver"

import GenericArray from "../generic/array.js"

import shared from "../shared.js"

function init() {
  function maxSatisfying(versions, range) {
    if (! Array.isArray(versions) ||
        typeof range !== "string") {
      return null
    }

    const cacheKey =
      (versions.length === 1 ? versions[0] : GenericArray.join(versions)) + "\0" +
      range

    const cache = shared.memoize.utilMaxSatisfying
    const cached = cache[cacheKey]

    return cached === void 0
      ? cache[cacheKey] = _maxSatisfying(versions, range)
      : cached
  }

  return maxSatisfying
}

export default shared.inited
  ? shared.module.utilMaxSatisfying
  : shared.module.utilMaxSatisfying = init()
