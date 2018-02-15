import SafeObject from "../builtin/object.js"

function has(object, key) {
  return object != null &&
    SafeObject.prototype.hasOwnProperty.call(object, key)
}

export default has
