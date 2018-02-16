import GenericObject from "../generic/object.js"

import isObjectLike from "./is-object-like.js"

function setDescriptor(object, key, descriptor) {
  return isObjectLike(object) && isObjectLike(descriptor)
    ? GenericObject.defineProperty(object, key, descriptor)
    : object
}

export default setDescriptor
