import SafeObject from "../builtin/object.js"

function setGetter(object, key, getter) {
  SafeObject.prototype.__defineGetter__.call(object, key, getter)
  return object
}

export default setGetter
