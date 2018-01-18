import binding from "../binding.js"
import isError from "../util/is-error.js"
import noDeprecationWarning from "../warning/no-deprecation-warning.js"
import setHiddenValue from "../util/set-hidden-value.js"

const utilBinding = binding.util
const arrowMessageSymbol = noDeprecationWarning(() => utilBinding.arrow_message_private_symbol)
const decoratedSymbol = noDeprecationWarning(() => utilBinding.decorated_private_symbol)

const useArrowMessageSymbol = arrowMessageSymbol !== void 0
const useDecoratedSymbol = decoratedSymbol !== void 0

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

export default decorateStackTrace
