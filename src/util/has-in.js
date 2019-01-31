import isObjectLike from "./is-object-like.js"
import shared from "../shared.js"

function init() {
  function hasIn(object, name) {
    return isObjectLike(object) &&
      Reflect.has(object, name)
  }

  return hasIn
}

export default shared.inited
  ? shared.module.utilHasIn
  : shared.module.utilHasIn = init()
