import shared from "../shared.js"
import { types } from "../safe/util.js"

function init() {
  if (typeof (types && types.isWeakMap) === "function") {
    return types.isWeakMap
  }

  const { toString } = Object.prototype

  return function isWeakMapFallback(value) {
    return toString.call(value) === "[object WeakMap]"
  }
}

export default shared.inited
  ? shared.module.utilIsWeakMap
  : shared.module.utilIsWeakMap = init()
