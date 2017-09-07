import createOptions from "./create-options.js"

const { defineProperty } = Object

const defaultDescriptor = createOptions({
  configurable: true,
  enumerable: true,
  value: void 0,
  writable: true
})

function setProperty(object, key, descriptor) {
  descriptor = createOptions(descriptor, defaultDescriptor)
  return defineProperty(object, key, descriptor)
}

export default setProperty
