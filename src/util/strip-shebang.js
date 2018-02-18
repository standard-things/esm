import ASCII from "../ascii.js"

const {
  NUMSIGN
} = ASCII

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
