import CHAR_CODE from "../constant/char-code.js"

import shared from "../shared.js"

function init() {
  const {
    COLON,
    FORWARD_SLASH,
    LOWERCASE_E,
    LOWERCASE_F,
    LOWERCASE_I,
    LOWERCASE_L
  } = CHAR_CODE

  function isFileOrigin(url) {
    if (typeof url !== "string") {
      return false
    }

    const { length } = url

    return length > 7 &&
      url.charCodeAt(0) === LOWERCASE_F &&
      url.charCodeAt(1) === LOWERCASE_I &&
      url.charCodeAt(2) === LOWERCASE_L &&
      url.charCodeAt(3) === LOWERCASE_E &&
      url.charCodeAt(4) === COLON &&
      url.charCodeAt(5) === FORWARD_SLASH &&
      url.charCodeAt(6) === FORWARD_SLASH
  }

  return isFileOrigin
}

export default shared.inited
  ? shared.module.utilIsFileOrigin
  : shared.module.utilIsFileOrigin = init()
