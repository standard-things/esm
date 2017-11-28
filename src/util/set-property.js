import createOptions from "./create-options.js"
import setDescriptor from "./set-descriptor.js"

const defaultDescriptor = {
  configurable: true,
  enumerable: true,
  value: void 0,
  writable: true
}

function setProperty(object, key, descriptor) {
  descriptor = createOptions(descriptor, defaultDescriptor)
  return setDescriptor(object, key, descriptor)
}

export default setProperty
