import getDescriptor from "./get-descriptor.js"
import has from "./has.js"
import setDescriptor from "./set-descriptor.js"

function assignProperty(object, source, key) {
  const sourceDescriptor = getDescriptor(source, key)

  if (sourceDescriptor) {
    if (sourceDescriptor.configurable === true &&
        sourceDescriptor.enumerable === true &&
        sourceDescriptor.writable === true &&
        has(sourceDescriptor, "value")) {
      object[key] = source[key]
    } else {
      setDescriptor(object, key, sourceDescriptor)
    }
  }

  return object
}

export default assignProperty
