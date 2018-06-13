import isObject from "./is-object.js"

function isDataDescriptor(descriptor) {
  return isObject(descriptor) &&
    descriptor.configurable === true &&
    descriptor.enumerable === true &&
    descriptor.writable === true &&
    Reflect.has(descriptor, "value")
}

export default isDataDescriptor
