import has from "./has.js"
import isObjectLike from "./is-object-like.js"

const { defineProperty, getOwnPropertyDescriptor } = Object

function assignProperty(object, source, key) {
  if (! isObjectLike(object) ||
      ! isObjectLike(source)) {
    return object
  }

  const sourceDescriptor = getOwnPropertyDescriptor(source, key)

  if (sourceDescriptor) {
    if (sourceDescriptor.configurable === true &&
        sourceDescriptor.enumerable === true &&
        sourceDescriptor.writable === true &&
        has(sourceDescriptor, "value")) {
      object[key] = source[key]
    } else {
      defineProperty(object, key, sourceDescriptor)
    }
  }

  return object
}

export default assignProperty
