import CHAR_CODE from "../constant/char-code.js"
import ENV from "../constant/env.js"

import { isAbsolute as _isAbsolute } from "../safe/path.js"
import shared from "../shared.js"

function init() {
  const {
    FORWARD_SLASH
  } = CHAR_CODE

  function isAbsolute(value) {
    if (typeof value !== "string") {
      return false
    }

    const cache = shared.memoize.pathIsAbsolute

    if (Reflect.has(cache, value)) {
      return cache[value]
    }

    if (value.charCodeAt(0) === FORWARD_SLASH) {
      const {
        WIN32
      } = ENV

      // Protocol relative URLs are not paths.
      const code1 = value.charCodeAt(1)

      if (! WIN32) {
        return cache[value] = code1 !== FORWARD_SLASH
      }
    }

    return cache[value] = _isAbsolute(value)
  }

  return isAbsolute
}

export default shared.inited
  ? shared.module.pathIsAbsolute
  : shared.module.pathIsAbsolute = init()
