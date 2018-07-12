import binding from "../binding.js"
import shared from "../shared.js"
import { types } from "../safe/util.js"

function init() {
  if (typeof (types && types.isExternal) === "function") {
    return types.isExternal
  }

  let useIsExternal

  const isExternal = function (value) {
    if (useIsExternal === void 0) {
      useIsExternal = typeof binding.util.isExternal === "function"
    }

    return useIsExternal && binding.util.isExternal(value)
  }

  return isExternal
}

export default shared.inited
  ? shared.module.utilIsExternal
  : shared.module.utilIsExternal = init()
