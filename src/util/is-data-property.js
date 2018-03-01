import isDataDescriptor from "./is-data-descriptor.js"
import isObjectLike from "./is-object-like.js"

function isDataProperty(object, key) {
  return isObjectLike(object) &&
    isDataDescriptor(Reflect.getOwnPropertyDescriptor(object, key))
}

export default isDataProperty
