import GenericObject from "../generic/object.js"

function getDescriptor(object, key) {
  if (object == null) {
    return null
  }

  return GenericObject.getOwnPropertyDescriptor(object, key) || null
}

export default getDescriptor
