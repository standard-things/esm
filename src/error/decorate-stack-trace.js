import binding from "../binding.js"

const {
  arrow_message_private_symbol,
  decorated_private_symbol,
  decorateErrorStack,
  setHiddenValue
} = binding.util

const useArrowMessageSymbol = arrow_message_private_symbol !== void 0
const useDecoratedSymbol = decorated_private_symbol !== void 0
const useDecorateErrorStack = typeof decorateErrorStack === "function"
const useSetHiddenValue = typeof setHiddenValue === "function"

function decorateStackTrace(error) {
  if (useSetHiddenValue) {
    if (useArrowMessageSymbol) {
      setHiddenValue(error, arrow_message_private_symbol, "")
    } else {
      try {
        setHiddenValue(error, "arrowMessage", "")
        setHiddenValue(error, "node:arrowMessage", "")
      } catch (e) {}
    }

    if (useDecoratedSymbol) {
      setHiddenValue(error, decorated_private_symbol, true)
    } else {
      try {
        setHiddenValue(error, "node:decorated", true)
      } catch (e) {}
    }
  }

  if (useDecorateErrorStack) {
    decorateErrorStack(error)
  }

  return error
}

export default decorateStackTrace
