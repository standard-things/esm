import isObjectLike from "./is-object-like.js"

function keys(object) {
  return isObjectLike(object) ? Object.keys(object) : []
}

export default keys
