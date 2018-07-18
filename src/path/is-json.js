import CHAR_CODE from "../constant/char-code.js"

import isObject from "../util/is-object.js"
import shared from "../shared.js"

function init() {
  const {
    DOT,
    LOWERCASE_J,
    LOWERCASE_N,
    LOWERCASE_O,
    LOWERCASE_S
  } = CHAR_CODE

  function isJSON(request) {
    if (typeof request === "string") {
      return endsWithJSON(request)
    }

    if (isObject(request)) {
      const { filename } = request

      if (typeof filename === "string") {
        return endsWithJSON(filename)
      }
    }

    return false
  }

  function endsWithJSON(filename) {
    const { length } = filename

    return length > 5 &&
      filename.charCodeAt(length - 4) === LOWERCASE_J &&
      filename.charCodeAt(length - 5) === DOT &&
      filename.charCodeAt(length - 3) === LOWERCASE_S &&
      filename.charCodeAt(length - 2) === LOWERCASE_O &&
      filename.charCodeAt(length - 1) === LOWERCASE_N
  }

  return isJSON
}

export default shared.inited
  ? shared.module.pathIsJSON
  : shared.module.pathIsJSON = init()
