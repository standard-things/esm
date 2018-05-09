import isDataDescriptor from "./is-data-descriptor.js"
import isObjectLike from "./is-object-like.js"

function copyProperty(object, source, name) {
  if (! isObjectLike(object) ||
      ! isObjectLike(source)) {
    return object
  }

  const descriptor = Reflect.getOwnPropertyDescriptor(source, name)

  if (descriptor) {
    if (isDataDescriptor(descriptor)) {
      object[name] = source[name]
    } else {
      Reflect.defineProperty(object, name, descriptor)
    }
  }

  return object
}

export default copyProperty
