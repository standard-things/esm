import isObjectLike from "./is-object-like.js"

const { __defineGetter__ } = Object.prototype

function setGetter(object, key, getter) {
  if (isObjectLike(object)) {
    __defineGetter__.call(object, key, getter)
  }

  return object
}

export default setGetter
