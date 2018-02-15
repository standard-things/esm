import SafeObject from "../builtin/object.js"

import isObjectLike from "./is-object-like.js"

function setDescriptor(object, key, descriptor) {
  return isObjectLike(object) && isObjectLike(descriptor)
    ? SafeObject.defineProperty(object, key, descriptor)
    : object
}

export default setDescriptor
