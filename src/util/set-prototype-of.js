import isObjectLike from "./is-object-like.js"
import shared from "../shared.js"

function init() {
  function setPrototypeOf(object, proto) {
    return isObjectLike(object) &&
           Reflect.setPrototypeOf(object, isObjectLike(proto) ? proto : null)
  }

  return setPrototypeOf
}

export default shared.inited
  ? shared.module.utilSetPrototypeOf
  : shared.module.utilSetPrototypeOf = init()
