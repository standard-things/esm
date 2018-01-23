import { isAbsolute as _isAbsolutePath } from "path"

const isPosix = process.platform !== "win32"

function isAbsolutePath(value) {
  if (typeof value !== "string") {
    return false
  }

  if (value.charCodeAt(0) === 47 /* / */) {
    // Protocol relative URLs are not paths.
    const code1 = value.charCodeAt(1)

    if (isPosix) {
      return code1 !== 47 /* / */
    }

    if (code1 === 47 /* / */ ||
        code1 === 92 /* \ */) {
      // Allow long UNC paths or named pipes.
      // https://en.wikipedia.org/wiki/Path_(computing)#Uniform_Naming_Convention
      // https://en.wikipedia.org/wiki/Named_pipe#In_Windows
      const code2 = value.charCodeAt(2)
      return code2 === 46 /* . */ || code2 === 63/* ? */
    }

    return true
  }

  return _isAbsolutePath(value)
}

export default isAbsolutePath
