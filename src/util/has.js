const { hasOwnProperty } = Object.prototype

function has(object, name) {
  return object != null &&
    hasOwnProperty.call(object, name)
}

export default has
