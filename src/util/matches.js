import GenericArray from "../generic/array.js"

function matches(array, pattern) {
  if (! Array.isArray(array)) {
    return false
  }

  return GenericArray.some(array, (value) => {
    return pattern.test(value)
  })
}

export default matches
