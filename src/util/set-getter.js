import GenericObject from "../generic/object.js"

function setGetter(object, key, getter) {
  GenericObject.__defineGetter__(object, key, getter)
  return object
}

export default setGetter
