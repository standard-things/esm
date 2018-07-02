import shared from "../shared.js"

function init() {
  function matches(array, pattern) {
    if (Array.isArray(array)) {
      for (const value of array) {
        if (pattern.test(value)) {
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
