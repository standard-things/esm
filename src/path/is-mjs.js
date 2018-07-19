import CHAR_CODE from "../constant/char-code.js"

import shared from "../shared.js"

function init() {
  const {
    DOT,
    LOWERCASE_J,
    LOWERCASE_M,
    LOWERCASE_S
  } = CHAR_CODE

  function isMJS(filename) {
    if (typeof filename !== "string") {
      return false
    }

    const { length } = filename

    return length > 4 &&
      filename.charCodeAt(length - 3) === LOWERCASE_M &&
      filename.charCodeAt(length - 4) === DOT &&
      filename.charCodeAt(length - 2) === LOWERCASE_J &&
      filename.charCodeAt(length - 1) === LOWERCASE_S
  }

  return isMJS
}

export default shared.inited
  ? shared.module.pathIsMJS
  : shared.module.pathIsMJS = init()
