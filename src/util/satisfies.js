import { satisfies as _satisfies } from "semver"
import shared from "../shared.js"
import stripPrereleaseTag from "./strip-prerelease-tag.js"

function init() {
  function satisfies(version, range) {
    if (typeof version !== "string" ||
        typeof range !== "string") {
      return false
    }

    const cacheKey = version + "\0" + range
    const cache = shared.memoize.utilSatisfies

    let cached = cache.get(cacheKey)

    if (cached === void 0) {
      cached = _satisfies(stripPrereleaseTag(version), range)
      cache.set(cacheKey, cached)
    }

    return cached
  }

  return satisfies
}

export default shared.inited
  ? shared.module.utilSatisfies
  : shared.module.utilSatisfies = init()
