import CHAR_CODE from "../constant/char-code.js"

import isSep from "./is-sep.js"
import shared from "../shared.js"

function init() {
  const {
    DOT
  } = CHAR_CODE

  function isRelative(value) {
    if (typeof value !== "string") {
      return false
    }

    const { length } = value

    if (length === 0) {
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

    return isSep(code)
  }

  return isRelative
}

export default shared.inited
  ? shared.module.pathIsRelativePath
  : shared.module.pathIsRelativePath = init()
