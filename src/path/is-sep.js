import CHAR_CODE from "../constant/char-code.js"

import isWin32 from "../env/is-win32.js"
import shared from "../shared.js"

function init() {
  const {
    BACKWARD_SLASH,
    FORWARD_SLASH
  } = CHAR_CODE

  const WIN32 = isWin32()

  function isSep(value) {
    if (typeof value === "number") {
      return value === FORWARD_SLASH ||
             (WIN32 &&
              value === BACKWARD_SLASH)
    }

    return value === "/" ||
           (WIN32 &&
            value === "\\")
  }

  return isSep
}

export default shared.inited
  ? shared.module.pathIsSep
  : shared.module.pathIsSep = init()
