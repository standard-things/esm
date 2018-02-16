import GenericString from "../generic/string.js"

import shared from "../shared.js"

function isRelativePath(value) {
  if (typeof value !== "string") {
    return false
  }

  const { length } = value

  if (! length) {
    return false
  }

  let code = GenericString.charCodeAt(value, 0)

  if (code !== 46 /* . */) {
    return false
  }

  if (length === 1) {
    return true
  }

  code = GenericString.charCodeAt(value, 1)

  if (code === 46 /* . */) {
    if (length === 2) {
      return true
    }

    code = GenericString.charCodeAt(value, 2)
  }

  if (shared.env.win32 &&
      code === 92 /* \ */) {
    return true
  }

  return code === 47 /* / */
}

export default isRelativePath
