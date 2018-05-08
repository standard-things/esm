import binding from "../binding.js"
import shared from "../shared.js"
import { types } from "../safe/util.js"

function init() {
  const ExError = shared.external.Error

  const { toString } = Object.prototype

  function isErrorFallback(value) {
    if (value instanceof Error ||
        value instanceof ExError) {
      return true
    }

    return toString.call(value) === "[object Error]"
  }

  if (typeof (types && types.isNativeError) === "function") {
    return types.isNativeError
  }

  return typeof binding.util.isNativeError === "function"
    ? binding.util.isNativeError
    : isErrorFallback
}

export default shared.inited
  ? shared.module.utilIsError
  : shared.module.utilIsError = init()
