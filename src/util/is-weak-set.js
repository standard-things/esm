import shared from "../shared.js"
import { types } from "../safe/util.js"

function init() {
  if (typeof (types && types.isWeakSet) === "function") {
    return types.isWeakSet
  }

  const { toString } = Object.prototype

  return function isWeakSetFallback(value) {
    return toString.call(value) === "[object WeakSet]"
  }
}

export default shared.inited
  ? shared.module.utilIsWeakSet
  : shared.module.utilIsWeakSet = init()
