import SafeObject from "../builtin/object.js"

function getDescriptor(object, key) {
  if (object == null) {
    return null
  }

  return SafeObject.getOwnPropertyDescriptor(object, key) || null
}

export default getDescriptor
