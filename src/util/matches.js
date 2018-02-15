import SafeArray from "../builtin/array.js"

function matches(array, pattern) {
  return SafeArray.isArray(array) &&
    array.some((value) => pattern.test(value))
}

export default matches
