import isObjectLike from "./is-object-like.js"

function setDescriptor(object, key, descriptor) {
  if (isObjectLike(object) &&
      isObjectLike(descriptor)) {
    Reflect.defineProperty(object, key, descriptor)
  }

  return object
}

export default setDescriptor
