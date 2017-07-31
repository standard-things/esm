import binding from "../binding/util.js"

const internalDecorateErrorStack = binding.decorateErrorStack
const internalSetHiddenValue = binding.setHiddenValue

const useInternalDecorateErrorStack = typeof internalDecorateErrorStack === "function"
const useInternalSetHiddenValue = typeof internalSetHiddenValue === "function"

function decorateStackTrace(error) {
  if (useInternalSetHiddenValue) {
    if ("arrow_message_private_symbol" in binding) {
      internalSetHiddenValue(error, binding.arrow_message_private_symbol, "")
    } else {
      try {
        internalSetHiddenValue(error, "arrowMessage", "")
        internalSetHiddenValue(error, "node:arrowMessage", "")
      } catch (e) {}
    }

    if ("decorated_private_symbol" in binding) {
      internalSetHiddenValue(error, binding.decorated_private_symbol, true)
    } else {
      try {
        internalSetHiddenValue(error, "node:decorated", true)
      } catch (e) {}
    }
  }

  if (useInternalDecorateErrorStack) {
    internalDecorateErrorStack(error)
  }

  return error
}

export default decorateStackTrace
