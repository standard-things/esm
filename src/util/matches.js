import shared from "../shared.js"
import toMatcher from "./to-matcher.js"

function init() {
  function matches(array, pattern) {
    const length = array ? array.length : 0
    const matcher = length ? toMatcher(pattern) : null

    let i = -1

    while (++i < length) {
      if (matcher(array[i])) {
        return true
      }
    }

    return false
  }

  return matches
}

export default shared.inited
  ? shared.module.utilMatches
  : shared.module.utilMatches = init()
