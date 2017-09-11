import isObjectLike from "./is-object-like.js"

const { __defineSetter__ } = Object.prototype

function setSetter(object, key, setter) {
  if (isObjectLike(object)) {
    __defineSetter__.call(object, key, setter)
  }

  return object
}

export default setSetter
