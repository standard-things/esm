import binding from "../binding.js"
import safeUtil from "../safe/util.js"
import shared from "../shared.js"

function init() {
  const { types } = safeUtil

  if (typeof (types && types.isNativeError) === "function") {
    return types.isNativeError
  }

  const { isNativeError } = binding.util

  return typeof isNativeError === "function"
    ? isNativeError
    : safeUtil.isError
}

export default shared.inited
  ? shared.module.utilIsError
  : shared.module.utilIsError = init()
