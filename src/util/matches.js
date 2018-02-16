import GenericArray from "../generic/array.js"
import GenericRegExp from "../generic/regexp.js"

function matches(array, pattern) {
  if (! GenericArray.isArray(array)) {
    return false
  }

  return GenericArray.some(array, (value) => {
    return GenericRegExp.test(pattern, value)
  })
}

export default matches
