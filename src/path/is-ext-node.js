import CHAR_CODE from "../constant/char-code.js"

import shared from "../shared.js"

function init() {
  const {
    DOT,
    LOWERCASE_D,
    LOWERCASE_E,
    LOWERCASE_N,
    LOWERCASE_O
  } = CHAR_CODE

  function isExtNode(filename) {
    if (typeof filename !== "string") {
      return false
    }

    const { length } = filename

    return length > 5 &&
      filename.charCodeAt(length - 4) === LOWERCASE_N &&
      filename.charCodeAt(length - 5) === DOT &&
      filename.charCodeAt(length - 3) === LOWERCASE_O &&
      filename.charCodeAt(length - 2) === LOWERCASE_D &&
      filename.charCodeAt(length - 1) === LOWERCASE_E
  }

  return isExtNode
}

export default shared.inited
  ? shared.module.pathIsExtNode
  : shared.module.pathIsExtNode = init()
