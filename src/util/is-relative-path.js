const codeOfBackslash = "\\".charCodeAt(0)
const codeOfDot = ".".charCodeAt(0)
const codeOfSlash = "/".charCodeAt(0)

const isWin = process.platform === "win32"

function isRelativePath(value) {
  if (typeof value !== "string") {
    return false
  }

  const { length } = value

  if (! length) {
    return false
  }

  let code = value.charCodeAt(0)

  if (code !== codeOfDot) {
    return false
  }

  if (length === 1) {
    return true
  }

  code = value.charCodeAt(1)

  if (code === codeOfDot) {
    if (length === 2) {
      return true
    }

    code = value.charCodeAt(2)
  }

  if (isWin &&
      code === codeOfBackslash) {
    return true
  }

  return code === codeOfSlash
}

export default isRelativePath
