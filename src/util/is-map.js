import binding from "../binding.js"
import shared from "../shared.js"
import { types } from "../safe/util.js"

function init() {
  if (typeof (types && types.isMap) === "function") {
    return types.isMap
  }

  let useIsMap

  const isMap = function (value) {
    if (useIsMap === void 0) {
      useIsMap = typeof binding.util.isMap === "function"
    }

    return useIsMap && binding.util.isMap(value)
  }

  return isMap
}

export default shared.inited
  ? shared.module.utilIsMap
  : shared.module.utilIsMap = init()
