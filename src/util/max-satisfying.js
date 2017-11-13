import FastObject from "../fast-object.js"

import { maxSatisfying as _maxSatisfying } from "semver"

const satisfyCache = new FastObject

function maxSatisfying(versions, range) {
  const key = versions + "\0" + range

  return key in satisfyCache
    ? satisfyCache[key]
    : satisfyCache[key] = _maxSatisfying(versions, range)
}

export default maxSatisfying
