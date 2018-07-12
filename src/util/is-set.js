import binding from "../binding.js"
import shared from "../shared.js"
import { types } from "../safe/util.js"

function init() {
  if (typeof (types && types.isSet) === "function") {
    return types.isSet
  }

  let useIsSet

  const isSet = function (value) {
    if (useIsSet === void 0) {
      useIsSet = typeof binding.util.isSet === "function"
    }

    return useIsSet && binding.util.isSet(value)
  }

  return isSet
}

export default shared.inited
  ? shared.module.utilIsSet
  : shared.module.utilIsSet = init()
