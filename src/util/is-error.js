import binding from "../binding.js"
import shared from "../shared.js"
import { types } from "../safe/util.js"

function init() {
  if (typeof (types && types.isNativeError) === "function") {
    return types.isNativeError
  }

  if (binding.util.isNativeError === "function") {
    return binding.util.isNativeError
  }

  const ExError = shared.external.Error

  const { toString } = Object.prototype

  return function isErrorFallback(value) {
    return value instanceof ExError ||
      value instanceof Error ||
      toString.call(value) === "[object Error]"
  }
}

export default shared.inited
  ? shared.module.utilIsError
  : shared.module.utilIsError = init()
