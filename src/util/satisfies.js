import { satisfies as _satisfies } from "semver"
import shared from "../shared.js"

function satisfies(version, range) {
  const cache = shared.memoize.satisfies
  const cacheKey = version + "\0" + range

  return cacheKey in cache
    ? cache[cacheKey]
    : cache[cacheKey] = _satisfies(version, range)
}

export default satisfies
