import getDescriptor from "./get-descriptor.js"
import isDataDescriptor from "./is-data-descriptor.js"

function isDataProperty(object, key) {
  return isDataDescriptor(getDescriptor(object, key))
}

export default isDataProperty
