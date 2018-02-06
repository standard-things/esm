import binding from "../binding.js"
import isError from "../util/is-error.js"
import setHiddenValue from "../util/set-hidden-value.js"

const { arrow_message_private_symbol, decorated_private_symbol } = binding.util

const useArrowMessageSymbol = arrow_message_private_symbol !== void 0
const useDecoratedSymbol = decorated_private_symbol !== void 0

function decorateStackTrace(error) {
  if (! isError(error)) {
    return error
  }

  if (useArrowMessageSymbol) {
    setHiddenValue(error, arrow_message_private_symbol, "")
  } else {
    setHiddenValue(error, "arrowMessage", "")
    setHiddenValue(error, "node:arrowMessage", "")
  }

  if (useDecoratedSymbol) {
    setHiddenValue(error, decorated_private_symbol, true)
  } else {
    setHiddenValue(error, "node:decorated", true)
  }

  return error
}

export default decorateStackTrace
