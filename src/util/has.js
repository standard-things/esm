import GenericObject from "../generic/object.js"

function has(object, key) {
  return object != null &&
    GenericObject.hasOwnProperty(object, key)
}

export default has
