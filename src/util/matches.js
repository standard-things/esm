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

export default matches
