import SemVer, { Range } from "semver"

import shared from "../shared.js"

function init() {
  function maxSatisfying(versions, range) {
    const cache = shared.memoize.utilMaxSatisfying
    const cacheKey = versions + "\0" + range

    if (Reflect.has(cache, cacheKey)) {
      return cache[cacheKey]
    }

    let maxSV
    let max = null

    try {
      range = new Range(range)
    } catch (e) {
      return max
    }

    for (const version of versions) {
      if (range.intersects(new Range("^" + version)) &&
           (! max ||
            maxSV.compare(version) === -1)) {
        max = version
        maxSV = new SemVer(max)
      }
    }

    return cache[cacheKey] = max
  }

  return maxSatisfying
}

export default shared.inited
  ? shared.module.utilMaxSatisfying
  : shared.module.utilMaxSatisfying = init()
