import GenericObject from "../generic/object.js"

function keys(object) {
  return object == null
    ? []
    : GenericObject.keys(object)
}

export default keys
