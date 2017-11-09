const codeOfPound = "#".charCodeAt(0)

const shebangRegExp = /^#!.*/

function stripShebang(string) {
  return string.charCodeAt(0) === codeOfPound
    ? string.replace(shebangRegExp, "")
    : string
}

export default stripShebang
