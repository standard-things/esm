import isDataDescriptor from "./is-data-descriptor.js"
import isObjectLike from "./is-object-like.js"

function copyProperty(object, source, key) {
  if (! isObjectLike(object) ||
      ! isObjectLike(source)) {
    return object
  }
  const descriptor = Reflect.getOwnPropertyDescriptor(source, key)

  if (descriptor) {
    if (isDataDescriptor(descriptor)) {
      object[key] = source[key]
    } else {
      Reflect.defineProperty(object, key, descriptor)
    }
  }

  return object
}

export default copyProperty
