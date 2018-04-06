import { maxSatisfying as _maxSatisfying } from "semver"
import shared from "../shared.js"

function init() {
  function maxSatisfying(versions, range) {
    const cache = shared.memoize.utilMaxSatisfying
    const cacheKey = versions + "\0" + range

    return cacheKey in cache
      ? cache[cacheKey]
      : cache[cacheKey] = _maxSatisfying(versions, range)
  }

  return maxSatisfying
}

export default shared.inited
  ? shared.module.utilMaxSatisfying
  : shared.module.utilMaxSatisfying = init()
