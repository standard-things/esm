import { maxSatisfying as _maxSatisfying } from "semver"
import shared from "../shared.js"

function maxSatisfying(versions, range) {
  const cacheKey = versions + "\0" + range

  return cacheKey in shared.maxSatisfying
    ? shared.maxSatisfying[cacheKey]
    : shared.maxSatisfying[cacheKey] = _maxSatisfying(versions, range)
}

export default maxSatisfying
