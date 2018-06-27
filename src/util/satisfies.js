import { satisfies as _satisfies } from "semver"
import shared from "../shared.js"
import stripPrereleaseTag from "./strip-prerelease-tag.js"

function init() {
  function satisfies(version, range) {
    if (typeof version !== "string" ||
        typeof range !== "string") {
      return false
    }

    const cache = shared.memoize.utilSatisfies
    const cacheKey = version + "\0" + range

    return Reflect.has(cache, cacheKey)
      ? cache[cacheKey]
      : cache[cacheKey] = _satisfies(stripPrereleaseTag(version), range)
  }

  return satisfies
}

export default shared.inited
  ? shared.module.utilSatisfies
  : shared.module.utilSatisfies = init()
