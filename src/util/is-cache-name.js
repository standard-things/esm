import CHAR_CODE from "../constant/char-code.js"

import isExtJS from "../path/is-ext-js.js"
import shared from "../shared.js"

function init() {
  const {
    DIGIT_0,
    DIGIT_9,
    LOWERCASE_A,
    LOWERCASE_Z
  } = CHAR_CODE

  function isCacheName(value) {
    if (typeof value !== "string" ||
        value.length !== 19 ||
        ! isExtJS(value)) {
      return false
    }

    let i = -1

    while (++i < 16) {
      const code = value.charCodeAt(i)

      if (! (code >= LOWERCASE_A && code <= LOWERCASE_Z ||
             code >= DIGIT_0 && code <= DIGIT_9)) {
        return false
      }
    }

    return true
  }

  return isCacheName
}

export default shared.inited
  ? shared.module.utilIsCacheName
  : shared.module.utilIsCacheName = init()
