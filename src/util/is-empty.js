const { hasOwnProperty } = Object.prototype

function isEmpty(object) {
  for (const key in object) {
    if (hasOwnProperty.call(object, key)) {
      return false
    }
  }

  return true
}

export default isEmpty
