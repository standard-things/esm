const codeOfPound = "#".charCodeAt(0)

const shebangRegExp = /^#!.*/

function stripShebang(string) {
  if (typeof string !== "string") {
    return ""
  }

  if (string.charCodeAt(0) === codeOfPound) {
    return string.replace(shebangRegExp, "")
  }

  return string
}

export default stripShebang
