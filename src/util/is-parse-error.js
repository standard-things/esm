import errors from "../parse/errors.js"
import shared from "../shared.js"

function init() {
  function isParseError(value) {
    for (const name in errors) {
      if (value instanceof errors[name]) {
        return true
      }
    }

    return false
  }

  return isParseError
}

export default shared.inited
  ? shared.module.utilIsParseError
  : shared.module.utilIsParseError = init()
