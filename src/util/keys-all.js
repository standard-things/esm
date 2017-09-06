import isObjectLike from "./is-object-like.js"

const { getOwnPropertyNames } = Object

function keysAll(object) {
  return isObjectLike(object) ? getOwnPropertyNames(object) : []
}

export default keysAll
