const { hasOwnProperty } = Object.prototype

function has(object, key) {
  return object != null && hasOwnProperty.call(object, key)
}

export default has
