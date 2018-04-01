import isDataDescriptor from "./is-data-descriptor.js"
import isObjectLike from "./is-object-like.js"

function isDataProperty(object, name) {
  return isObjectLike(object) &&
    isDataDescriptor(Reflect.getOwnPropertyDescriptor(object, name))
}

export default isDataProperty
