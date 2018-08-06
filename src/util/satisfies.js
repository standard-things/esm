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
    const cached = cache[cacheKey]

    return cached === void 0
      ? cache[cacheKey] = _satisfies(stripPrereleaseTag(version), range)
      : cached
  }

  return satisfies
}

export default shared.inited
  ? shared.module.utilSatisfies
  : shared.module.utilSatisfies = init()
