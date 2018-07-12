import binding from "../binding.js"
import shared from "../shared.js"
import { types } from "../safe/util.js"

function init() {
  if (typeof (types && types.isSetIterator) === "function") {
    return types.isSetIterator
  }

  let useIsSetIterator

  const isSetIterator = function (value) {
    if (useIsSetIterator === void 0) {
      useIsSetIterator = typeof binding.util.isSetIterator === "function"
    }

    return useIsSetIterator && binding.util.isSetIterator(value)
  }

  return isSetIterator
}

export default shared.inited
  ? shared.module.utilIsSetIterator
  : shared.module.utilIsSetIterator = init()
