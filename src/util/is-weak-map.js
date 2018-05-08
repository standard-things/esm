import shared from "../shared.js"
import { types } from "../safe/util.js"

function init() {
  const { toString } = Object.prototype

  function isWeakMapFallback(value) {
    return toString.call(value) === "[object WeakMap]"
  }

  return typeof (types && types.isWeakMap) === "function"
    ? types.isWeakMap
    : isWeakMapFallback
}

export default shared.inited
  ? shared.module.utilIsWeakMap
  : shared.module.utilIsWeakMap = init()
