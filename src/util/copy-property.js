import getDescriptor from "./get-descriptor.js"
import isDataDescriptor from "./is-data-descriptor.js"
import setDescriptor from "./set-descriptor.js"

function copyProperty(object, source, key) {
  const descriptor = getDescriptor(source, key)

  if (descriptor) {
    if (isDataDescriptor(descriptor)) {
      object[key] = source[key]
    } else {
      setDescriptor(object, key, descriptor)
    }
  }

  return object
}

export default copyProperty
