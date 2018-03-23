import setHiddenValue from "../util/set-hidden-value.js"
import shared from "../shared.js"

function init() {
  function decorateStackTrace(error) {
    const { arrowSymbol, decoratedSymbol } = shared.utilBinding

    if (arrowSymbol !== void 0) {
      setHiddenValue(error, arrowSymbol, "")
    }

    if (decoratedSymbol !== void 0) {
      setHiddenValue(error, decoratedSymbol, true)
    }

    return error
  }

  return decorateStackTrace
}

export default shared.inited
  ? shared.module.errorDecorateStackTrace
  : shared.module.errorDecorateStackTrace = init()
