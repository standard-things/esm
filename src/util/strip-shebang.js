import toString from "./to-string.js"

const codeOfPound = "#".charCodeAt(0)

const shebangRegExp = /^#!.*/

function stripShebang(string) {
  string = toString(string)

  if (string.charCodeAt(0) === codeOfPound) {
    return string.replace(shebangRegExp, "")
  }

  return string
}

export default stripShebang
