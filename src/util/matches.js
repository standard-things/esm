import shared from "../shared.js"
import toMatcher from "./to-matcher.js"

function init() {
  function matches(array, pattern) {
    if (Array.isArray(array)) {
      const matcher = toMatcher(pattern)

      for (const value of array) {
        if (matcher(value)) {
          return true
        }
      }
    }

    return false
  }

  return matches
}

export default shared.inited
  ? shared.module.utilMatches
  : shared.module.utilMatches = init()
