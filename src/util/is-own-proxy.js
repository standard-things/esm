import isObjectLike from "./is-object-like.js"
import shared from "../shared.js"

function isOwnProxy(value) {
  return isObjectLike(value) &&
    shared.ownProxy.has(value)
}

export default isOwnProxy
