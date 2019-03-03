import getObjectTag from "./get-object-tag.js"
import shared from "../shared.js"
import { types } from "../safe/util.js"

function init() {
  if (typeof (types && types.isWeakSet) === "function") {
    return types.isWeakSet
  }

  return function isWeakSet(value) {
    return getObjectTag(value) === "[object WeakSet]"
  }
}

export default shared.inited
  ? shared.module.utilIsWeakSet
  : shared.module.utilIsWeakSet = init()
