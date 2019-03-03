import getObjectTag from "./get-object-tag.js"
import shared from "../shared.js"
import { types } from "../safe/util.js"

function init() {
  if (typeof (types && types.isWeakMap) === "function") {
    return types.isWeakMap
  }

  return function isWeakMap(value) {
    return getObjectTag(value) === "[object WeakMap]"
  }
}

export default shared.inited
  ? shared.module.utilIsWeakMap
  : shared.module.utilIsWeakMap = init()
