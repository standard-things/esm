import binding from "../binding.js"
import getHiddenValue from "./get-hidden-value.js"
import isError from "./is-error.js"
import noDeprecationWarning from "../warning/no-deprecation-warning.js"

const utilBinding = binding.util
const arrowMessageSymbol = noDeprecationWarning(() => utilBinding.arrow_message_private_symbol)
const decoratedSymbol = noDeprecationWarning(() => utilBinding.decorated_private_symbol)

const useArrowMessageSymbol = arrowMessageSymbol !== void 0
const useDecoratedSymbol = decoratedSymbol !== void 0

function isStackTraceDecorated(error) {
  if (! isError(error)) {
    return false
  }

  if (useArrowMessageSymbol) {
    if (getHiddenValue(error, arrowMessageSymbol) !== "") {
      return false
    }
  } else {
    if (getHiddenValue(error, "arrowMessage") !== "" ||
        getHiddenValue(error, "node:arrowMessage") !== "") {
      return false
    }
  }

  if (useDecoratedSymbol) {
    if (getHiddenValue(error, decoratedSymbol) !== true) {
      return false
    }
  } else {
    if (getHiddenValue(error, "node:decorated") !== true) {
      return false
    }
  }

  return true
}

export default isStackTraceDecorated
