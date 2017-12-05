import { isAbsolute as _isAbsolutePath } from "path"

const isPosix = process.platform !== "win32"

const codeOfBackslash = "\\".charCodeAt(0)
const codeOfDot = ".".charCodeAt(0)
const codeOfQMark = "?".charCodeAt(0)
const codeOfSlash = "/".charCodeAt(0)

function isAbsolutePath(value) {
  if (typeof value !== "string") {
    return false
  }

  if (value.charCodeAt(0) === codeOfSlash) {
    // Protocol relative URLs are not paths.
    const code1 = value.charCodeAt(1)

    if (isPosix) {
      return code1 !== codeOfSlash
    }

    if (code1 === codeOfSlash ||
        code1 === codeOfBackslash) {
      // Allow long UNC paths or named pipes.
      // https://en.wikipedia.org/wiki/Path_(computing)#Uniform_Naming_Convention
      // https://en.wikipedia.org/wiki/Named_pipe#In_Windows
      const code2 = value.charCodeAt(2)
      return code2 === codeOfDot || code2 === codeOfQMark
    }

    return true
  }

  return _isAbsolutePath(value)
}

export default isAbsolutePath
