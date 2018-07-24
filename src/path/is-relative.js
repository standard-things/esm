import CHAR_CODE from "../constant/char-code.js"
import ENV from "../constant/env.js"

import shared from "../shared.js"

function init() {
  const {
    BACKWARD_SLASH,
    DOT,
    FORWARD_SLASH
  } = CHAR_CODE

  function isRelative(value) {
    if (typeof value !== "string") {
      return false
    }

    const { length } = value

    if (! length) {
      return false
    }

    let code = value.charCodeAt(0)

    if (code !== DOT) {
      return false
    }

    if (length === 1) {
      return true
    }

    code = value.charCodeAt(1)

    if (code === DOT) {
      if (length === 2) {
        return true
      }

      code = value.charCodeAt(2)
    }

    const {
      WIN32
    } = ENV

    if (WIN32 &&
        code === BACKWARD_SLASH) {
      return true
    }

    return code === FORWARD_SLASH
  }

  return isRelative
}

export default shared.inited
  ? shared.module.pathIsRelativePath
  : shared.module.pathIsRelativePath = init()
