import CHAR_CODE from "../constant/char-code.js"

import isWin32 from "../env/is-win32.js"
import shared from "../shared.js"

function init() {
  const {
    BACKWARD_SLASH,
    FORWARD_SLASH
  } = CHAR_CODE

  const isWin = isWin32()

  function isSep(value) {
    if (typeof value === "number") {
      return value === FORWARD_SLASH ||
        (isWin &&
         value === BACKWARD_SLASH)
    }

    return value === "/" ||
      (isWin &&
       value === "\\")
  }

  return isSep
}

export default shared.inited
  ? shared.module.pathIsSep
  : shared.module.pathIsSep = init()
