const codeOfBackslash = "\\".charCodeAt(0)
const codeOfColon = ":".charCodeAt(0)
const codeOfDot = ".".charCodeAt(0)
const codeOfSlash = "/".charCodeAt(0)

const isWin = process.platform === "win32"

function isPath(value) {
  if (typeof value !== "string") {
    return false
  }

  const code0 = value.charCodeAt(0)
  const code1 = value.charCodeAt(1)

  if (code0 === codeOfDot) {
    return code1 === codeOfSlash ||
      (code1 === codeOfDot && value.charCodeAt(2) === codeOfSlash)
  }

  if (isWin) {
    // Detect drive letter, i.e. `[a-zA-Z]:\\`
    return code1 === codeOfColon &&
      ((code0 > 64 && code0 < 91) || (code0 > 96 && code0 < 123)) &&
      value.charCodeAt(2) === codeOfBackslash
  }

  return code0 === codeOfSlash && code1 !== codeOfSlash
}

export default isPath
