import binding from "../binding.js"
import shared from "../shared.js"
import { types } from "../safe/util.js"

function init() {
  if (typeof (types && types.isMapIterator) === "function") {
    return types.isMapIterator
  }

  let useIsMapIterator

  const isMapIterator = function (value) {
    if (useIsMapIterator === void 0) {
      useIsMapIterator = typeof binding.util.isMapIterator === "function"
    }

    return useIsMapIterator && binding.util.isMapIterator(value)
  }

  return isMapIterator
}

export default shared.inited
  ? shared.module.utilIsMapIterator
  : shared.module.utilIsMapIterator = init()
