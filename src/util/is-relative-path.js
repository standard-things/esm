import ASCII from "../ascii.js"
import GenericString from "../generic/string.js"

import shared from "../shared.js"

const {
  BSLASH,
  PERIOD,
  SLASH
} = ASCII

function isRelativePath(value) {
  if (typeof value !== "string") {
    return false
  }

  const { length } = value

  if (! length) {
    return false
  }

  let code = GenericString.charCodeAt(value, 0)

  if (code !== PERIOD) {
    return false
  }

  if (length === 1) {
    return true
  }

  code = GenericString.charCodeAt(value, 1)

  if (code === PERIOD) {
    if (length === 2) {
      return true
    }

    code = GenericString.charCodeAt(value, 2)
  }

  if (shared.env.win32 &&
      code === BSLASH) {
    return true
  }

  return code === SLASH
}

export default isRelativePath
