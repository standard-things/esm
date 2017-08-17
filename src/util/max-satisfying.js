import FastObject from "../fast-object.js"

import { maxSatisfying as _maxSatisfying } from "semver"

const satisfyCache = new FastObject

function maxSatisfying(versions, range) {
  const cacheKey = versions + "\0" + range

  if (cacheKey in satisfyCache) {
    return satisfyCache[cacheKey]
  }

  return satisfyCache[cacheKey] = _maxSatisfying(versions, range)
}

export default maxSatisfying
