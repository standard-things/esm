import CHAR_CODE from "../constant/char-code.js"

const {
  NUMSIGN
} = CHAR_CODE

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
