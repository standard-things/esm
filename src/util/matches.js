import GenericArray from "../generic/array.js"

const { isArray } = Array

function matches(array, pattern) {
  if (! isArray(array)) {
    return false
  }

  return GenericArray.some(array, (value) => {
    return pattern.test(value)
  })
}

export default matches
