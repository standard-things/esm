import setHiddenValue from "../util/set-hidden-value.js"
import shared from "../shared.js"

function init() {
  function decorateStackTrace(error) {
    const { errorDecoratedSymbol } = shared.utilBinding

    if (errorDecoratedSymbol !== void 0) {
      setHiddenValue(error, errorDecoratedSymbol, true)
    }

    return error
  }

  return decorateStackTrace
}

export default shared.inited
  ? shared.module.errorDecorateStackTrace
  : shared.module.errorDecorateStackTrace = init()
