const hasOwn = Object.prototype.hasOwnProperty

function has(object, key) {
  return object != null && hasOwn.call(object, key)
}

export default has
