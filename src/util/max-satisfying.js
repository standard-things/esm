import FastObject from "../fast-object.js"

import { maxSatisfying as _maxSatisfying } from "semver"

const satisfyCache = new FastObject

function maxSatisfying(versions, range) {
  const cacheKey = versions + "\0" + range

  return cacheKey in satisfyCache
    ? satisfyCache[cacheKey]
    : satisfyCache[cacheKey] = _maxSatisfying(versions, range)
}

export default maxSatisfying
