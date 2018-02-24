import CHAR_CODE from "../constant/char-code.js"

import shared from "../shared.js"

const {
  BSLASH,
  PERIOD,
  SLASH
} = CHAR_CODE

function isRelativePath(value) {
  if (typeof value !== "string") {
    return false
  }

  const { length } = value

  if (! length) {
    return false
  }

  let code = value.charCodeAt(0)

  if (code !== PERIOD) {
    return false
  }

  if (length === 1) {
    return true
  }

  code = value.charCodeAt(1)

  if (code === PERIOD) {
    if (length === 2) {
      return true
    }

    code = value.charCodeAt(2)
  }

  if (shared.env.win32 &&
      code === BSLASH) {
    return true
  }

  return code === SLASH
}

export default isRelativePath
