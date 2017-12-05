const codeOfBackslash = "\\".charCodeAt(0)
const codeOfColon = ":".charCodeAt(0)
const codeOfSlash = "/".charCodeAt(0)

const isPosix = process.platform !== "win32"

function isAbsolutePath(value) {
  if (typeof value !== "string") {
    return false
  }

  if (isPosix) {
    return value.charCodeAt(0) === codeOfSlash &&
      value.charCodeAt(1) !== codeOfSlash
  }

  // Detect drive letter, i.e. `[A-Za-z]:\\`
  if (value.charCodeAt(1) === codeOfColon &&
      value.charCodeAt(2) === codeOfBackslash) {
    const code0 = value.charCodeAt(0)
    return (code0 > 64 && code0 < 91) || (code0 > 96 && code0 < 123)
  }

  return false
}

export default isAbsolutePath
