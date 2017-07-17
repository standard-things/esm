import createOptions from "./create-options.js"

const defaultDescriptor = {
  configurable: true,
  enumerable: true,
  value: void 0,
  writable: true
}

export default function setProperty(object, key, descriptor) {
  descriptor = createOptions(descriptor, defaultDescriptor)
  return Object.defineProperty(object, key, descriptor)
}
