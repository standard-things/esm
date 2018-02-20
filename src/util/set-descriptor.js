import isObjectLike from "./is-object-like.js"

function setDescriptor(object, key, descriptor) {
  return isObjectLike(object) && isObjectLike(descriptor)
    ? Object.defineProperty(object, key, descriptor)
    : object
}

export default setDescriptor
