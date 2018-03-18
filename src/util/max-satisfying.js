import { maxSatisfying as _maxSatisfying } from "semver"
import shared from "../shared.js"

function maxSatisfying(versions, range) {
  const cache = shared.memoize.maxSatisfying
  const cacheKey = versions + "\0" + range

  return cacheKey in cache
    ? cache[cacheKey]
    : cache[cacheKey] = _maxSatisfying(versions, range)
}

export default maxSatisfying
