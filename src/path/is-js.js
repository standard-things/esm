import CHAR_CODE from "../constant/char-code.js"

import isObject from "../util/is-object.js"
import shared from "../shared.js"

function init() {
  const {
    DOT,
    LOWERCASE_J,
    LOWERCASE_S
  } = CHAR_CODE

  function isJS(request) {
    if (typeof request === "string") {
      return endsWithJS(request)
    }

    if (isObject(request)) {
      const { filename } = request

      if (typeof filename === "string") {
        return endsWithJS(filename)
      }
    }

    return false
  }

  function endsWithJS(filename) {
    const { length } = filename

    return length > 3 &&
      filename.charCodeAt(length - 3) === DOT &&
      filename.charCodeAt(length - 2) === LOWERCASE_J &&
      filename.charCodeAt(length - 1) === LOWERCASE_S
  }

  return isJS
}

export default shared.inited
  ? shared.module.pathIsJS
  : shared.module.pathIsJS = init()
