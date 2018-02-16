import GenericObject from "../generic/object.js"

function setSetter(object, key, setter) {
  GenericObject.__defineSetter__(object, key, setter)
  return object
}

export default setSetter
