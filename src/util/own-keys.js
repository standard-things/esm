import isObjectLike from "./is-object-like.js"
import shared from "../shared.js"

function init() {
  function ownKeys(object) {
    return isObjectLike(object)
      ? Reflect.ownKeys(object)
      : []
  }

  return ownKeys
}

export default shared.inited
  ? shared.module.utilOwnKeys
  : shared.module.utilOwnKeys = init()
