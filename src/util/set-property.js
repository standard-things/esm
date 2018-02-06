import createOptions from "./create-options.js"
import setDescriptor from "./set-descriptor.js"

const defaultDescriptor = {
  __proto__: null,
  configurable: true,
  enumerable: true,
  value: void 0,
  writable: true
}

function setProperty(object, key, descriptor) {
  descriptor = createOptions(descriptor, defaultDescriptor)

  if ("get" in descriptor ||
      "set" in descriptor) {
    delete descriptor.value
    delete descriptor.writable
  }

  return setDescriptor(object, key, descriptor)
}

export default setProperty
