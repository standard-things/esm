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

    const cache = shared.memoize.pathIsRelative

    if (Reflect.has(cache, value)) {
      return cache[value]
    }

    let code = value.charCodeAt(0)

    if (code !== DOT) {
      return cache[value] = false
    }

    if (length === 1) {
      return cache[value] = true
    }

    code = value.charCodeAt(1)

    if (code === DOT) {
      if (length === 2) {
        return cache[value] = true
      }

      code = value.charCodeAt(2)
    }

    const {
      WIN32
    } = ENV

    if (WIN32 &&
        code === BACKWARD_SLASH) {
      return cache[value] = true
    }

    return cache[value] = code === FORWARD_SLASH
  }

  return isRelative
}

export default shared.inited
  ? shared.module.pathIsRelativePath
  : shared.module.pathIsRelativePath = init()
