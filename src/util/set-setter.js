import SafeObject from "../builtin/object.js"

function setSetter(object, key, setter) {
  SafeObject.prototype.__defineSetter__.call(object, key, setter)
  return object
}

export default setSetter
