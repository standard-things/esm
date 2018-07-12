import binding from "../binding.js"
import shared from "../shared.js"
import { types } from "../safe/util.js"

function init() {
  if (typeof (types && types.isRegExp) === "function") {
    return types.isRegExp
  }

  let useIsRegExp

  const isRegExp = function (value) {
    if (useIsRegExp === void 0) {
      useIsRegExp = typeof binding.util.isRegExp === "function"
    }

    return useIsRegExp && binding.util.isRegExp(value)
  }

  return isRegExp
}

export default shared.inited
  ? shared.module.utilIsRegExp
  : shared.module.utilIsRegExp = init()
