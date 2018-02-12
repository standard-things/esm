import isObject from "../util/is-object.js"

function isDataDescriptor(descriptor) {
  return isObject(descriptor) &&
    descriptor.configurable === true &&
    descriptor.enumerable === true &&
    descriptor.writable === true
}

export default isDataDescriptor
