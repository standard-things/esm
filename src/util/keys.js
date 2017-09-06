import isObjectLike from "./is-object-like.js"

const _keys = Object.keys

function keys(object) {
  return isObjectLike(object) ? _keys(object) : []
}

export default keys
