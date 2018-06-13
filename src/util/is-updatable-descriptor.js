import isObject from "./is-object.js"

function isUpdatableDescriptor(descriptor) {
  return isObject(descriptor) &&
    (descriptor.configurable === true ||
     descriptor.writable === true) &&
    Reflect.has(descriptor, "value")
}

export default isUpdatableDescriptor
