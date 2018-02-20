import setDescriptor from "./set-descriptor.js"
import toNullObject from "./to-null-object.js"

const defaultDescriptor = {
  __proto__: null,
  configurable: true,
  enumerable: true,
  value: void 0,
  writable: true
}

function setProperty(object, key, descriptor) {
  descriptor = toNullObject(descriptor, defaultDescriptor)

  if ("get" in descriptor ||
      "set" in descriptor) {
    delete descriptor.value
    delete descriptor.writable
  }

  return setDescriptor(object, key, descriptor)
}

export default setProperty
