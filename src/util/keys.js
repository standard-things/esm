import SafeObject from "../builtin/object.js"

function keys(object) {
  return object == null
    ? []
    : SafeObject.keys(object)
}

export default keys
