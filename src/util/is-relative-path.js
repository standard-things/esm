const codeOfDot = ".".charCodeAt(0)
const codeOfSlash = "/".charCodeAt(0)

function isRelativePath(value) {
  if (typeof value !== "string") {
    return false
  }

  const code0 = value.charCodeAt(0)

  if (code0 !== codeOfDot) {
    return false
  }

  const code1 = value.charCodeAt(1)

  return code1 === codeOfSlash ||
    (code1 === codeOfDot && value.charCodeAt(2) === codeOfSlash)
}

export default isRelativePath
