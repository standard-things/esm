import createOptions from "./create-options.js"
import isObjectLike from "./is-object-like.js"

const { defineProperty } = Object

const defaultDescriptor = createOptions({
  configurable: true,
  enumerable: true,
  value: void 0,
  writable: true
})

function setProperty(object, key, descriptor) {
  if (isObjectLike(object)) {
    descriptor = createOptions(descriptor, defaultDescriptor)
    defineProperty(object, key, descriptor)
  }

  return object
}

export default setProperty
