import setHiddenValue from "../util/set-hidden-value.js"
import shared from "../shared.js"

function decorateStackTrace(error) {
  const { arrowSymbol, decoratedSymbol } = shared

  if (arrowSymbol !== void 0) {
    setHiddenValue(error, arrowSymbol, "")
  }

  if (decoratedSymbol !== void 0) {
    setHiddenValue(error, decoratedSymbol, true)
  }

  return error
}

export default decorateStackTrace
