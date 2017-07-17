import isObjectLike from "./is-object-like.js"

export default function keys(object) {
  return isObjectLike(object) ? Object.keys(object) : []
}
