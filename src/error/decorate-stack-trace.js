import binding from "../binding.js"
import isError from "../util/is-error.js"
import setHiddenValue from "../util/set-hidden-value.js"
import shared from "../shared.js"

function decorateStackTrace(error) {
  if (! isError(error)) {
    return error
  }

  const { support } = shared

  if (support.arrowSymbol) {
    setHiddenValue(error, binding.util.arrow_message_private_symbol, "")
  } else {
    setHiddenValue(error, "arrowMessage", "")
    setHiddenValue(error, "node:arrowMessage", "")
  }

  if (support.decoratedSymbol) {
    setHiddenValue(error, binding.util.decorated_private_symbol, true)
  } else {
    setHiddenValue(error, "node:decorated", true)
  }

  return error
}

export default decorateStackTrace
