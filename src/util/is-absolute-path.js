import GenericString from "../generic/string.js"

import { isAbsolute as _isAbsolutePath } from "path"
import shared from "../shared.js"

function isAbsolutePath(value) {
  if (typeof value !== "string") {
    return false
  }

  if (GenericString.charCodeAt(value, 0) === 47 /* / */) {
    // Protocol relative URLs are not paths.
    const code1 = GenericString.charCodeAt(value, 1)

    if (! shared.env.win32) {
      return code1 !== 47 /* / */
    }

    if (code1 === 47 /* / */ ||
        code1 === 92 /* \ */) {
      // Allow long UNC paths or named pipes.
      // https://en.wikipedia.org/wiki/Path_(computing)#Uniform_Naming_Convention
      // https://en.wikipedia.org/wiki/Named_pipe#In_Windows
      const code2 = GenericString.charCodeAt(value, 2)
      return code2 === 46 /* . */ || code2 === 63 /* ? */
    }

    return true
  }

  return _isAbsolutePath(value)
}

export default isAbsolutePath
