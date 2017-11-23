import binding from "../binding.js"
import isError from "../util/is-error.js"
import noDeprecationWarning from "../warning/no-deprecation-warning.js"

const utilBinding = binding.util
const _setHiddenValue = noDeprecationWarning(() => utilBinding.setHiddenValue)
const arrowMessageSymbol = noDeprecationWarning(() => utilBinding.arrow_message_private_symbol)
const decoratedSymbol = noDeprecationWarning(() => utilBinding.decorated_private_symbol)

const useArrowMessageSymbol = arrowMessageSymbol !== void 0
const useDecoratedSymbol = decoratedSymbol !== void 0
const useSetHiddenValue = typeof _setHiddenValue === "function"

function decorateStackTrace(error) {
  if (! isError(error)) {
    return error
  }

  if (useArrowMessageSymbol) {
    setHiddenValue(error, arrowMessageSymbol, "")
  } else {
    setHiddenValue(error, "arrowMessage", "")
    setHiddenValue(error, "node:arrowMessage", "")
  }

  if (useDecoratedSymbol) {
    setHiddenValue(error, decoratedSymbol, true)
  } else {
    setHiddenValue(error, "node:decorated", true)
  }

  return error
}

function setHiddenValue(object, key, value) {
  if (useSetHiddenValue) {
    try {
      return _setHiddenValue.call(utilBinding, object, key, value)
    } catch (e) {}
  }

  return false
}

export default decorateStackTrace
