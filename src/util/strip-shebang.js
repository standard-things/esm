import CHAR_CODES from "../char-codes.js"

const {
  NUMSIGN
} = CHAR_CODES

const shebangRegExp = /^#!.*/

function stripShebang(string) {
  if (typeof string !== "string") {
    return ""
  }

  return string.charCodeAt(0) === NUMSIGN
    ? string.replace(shebangRegExp, "")
    : string
}

export default stripShebang
