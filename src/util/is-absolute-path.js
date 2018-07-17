import CHAR_CODE from "../constant/char-code.js"
import ENV from "../constant/env.js"

import isAbsolute from "../path/is-absolute.js"
import shared from "../shared.js"

function init() {
  const {
    BACKWARD_SLASH,
    DOT,
    FORWARD_SLASH,
    QUESTION_MARK
  } = CHAR_CODE

  function isAbsolutePath(value) {
    if (typeof value !== "string") {
      return false
    }

    if (value.charCodeAt(0) === FORWARD_SLASH) {
      const {
        WIN32
      } = ENV

      // Protocol relative URLs are not paths.
      const code1 = value.charCodeAt(1)

      if (! WIN32) {
        return code1 !== FORWARD_SLASH
      }

      if (code1 === BACKWARD_SLASH ||
          code1 === FORWARD_SLASH) {
        // Allow long UNC paths or named pipes.
        // https://en.wikipedia.org/wiki/Path_(computing)#Uniform_Naming_Convention
        // https://en.wikipedia.org/wiki/Named_pipe#In_Windows
        const code2 = value.charCodeAt(2)
        return code2 === DOT || code2 === QUESTION_MARK
      }

      return true
    }

    return isAbsolute(value)
  }

  return isAbsolutePath
}

export default shared.inited
  ? shared.module.utilIsAbsolutePath
  : shared.module.utilIsAbsolutePath = init()
