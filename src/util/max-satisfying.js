import { maxSatisfying as _maxSatisfying } from "semver"
import shared from "../shared.js"

function maxSatisfying(versions, range) {
  const key = versions + "\0" + range

  return key in shared.maxSatisfying
    ? shared.maxSatisfying[key]
    : shared.maxSatisfying[key] = _maxSatisfying(versions, range)
}

export default maxSatisfying
