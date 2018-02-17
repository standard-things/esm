import ASCII from "../ascii.js"
import GenericString from "../generic/string.js"

const {
  NUMSIGN
} = ASCII

const shebangRegExp = /^#!.*/

function stripShebang(string) {
  if (typeof string !== "string") {
    return ""
  }

  return GenericString.charCodeAt(string, 0) === NUMSIGN
    ? GenericString.replace(string, shebangRegExp, "")
    : string
}

export default stripShebang
