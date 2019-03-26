import CHAR_CODE from "../constant/char-code.js"

import shared from "../shared.js"

function init() {
  const {
    DOT,
    LOWERCASE_J,
    LOWERCASE_N,
    LOWERCASE_O,
    LOWERCASE_S
  } = CHAR_CODE

  function isExtJSON(filename) {
    if (typeof filename !== "string") {
      return false
    }

    const { length } = filename

    return length > 5 &&
      filename.charCodeAt(length - 4) === LOWERCASE_J &&
      filename.charCodeAt(length - 5) === DOT &&
      filename.charCodeAt(length - 3) === LOWERCASE_S &&
      filename.charCodeAt(length - 2) === LOWERCASE_O &&
      filename.charCodeAt(length - 1) === LOWERCASE_N
  }

  return isExtJSON
}

export default shared.inited
  ? shared.module.pathIsExtJSON
  : shared.module.pathIsExtJSON = init()
