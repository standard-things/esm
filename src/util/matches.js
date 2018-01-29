const { isArray } = Array

function matches(array, pattern) {
  return isArray(array) &&
    array.some((value) => pattern.test(value))
}

export default matches
