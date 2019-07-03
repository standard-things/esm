import CHAR_CODE from "../constant/char-code.js"

import isClassFunction from "./is-class-function.js"
import shared from "../shared.js"

function init() {
  const {
    UPPERCASE_A,
    UPPERCASE_Z
  } = CHAR_CODE

  function isClassLikeFunction(value) {
    if (typeof value === "function") {
      if (isClassFunction(value)) {
        return true
      }

      const { name } = value

      if (typeof name === "string") {
        const code = name.charCodeAt(0)

        return code >= UPPERCASE_A && code <= UPPERCASE_Z
      }
    }

    return false
  }

  return isClassLikeFunction
}

export default shared.inited
  ? shared.module.utilIsClassLikeFunction
  : shared.module.utilIsClassLikeFunction = init()
