const codeOfDot = ".".charCodeAt(0)
const codeOfForwardSlash = "/".charCodeAt(0)

function isPath(value) {
  if (typeof value !== "string") {
    return false
  }

  const code0 = value.charCodeAt(0)
  const code1 = value.charCodeAt(1)

  return code0 === codeOfForwardSlash ||
    (code0 === codeOfDot &&
      (code1 === codeOfForwardSlash ||
        (code1 === codeOfDot && value.charCodeAt(2) === codeOfForwardSlash)))
}

export default isPath
