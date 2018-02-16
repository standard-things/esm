import GenericString from "../generic/string.js"

const shebangRegExp = /^#!.*/

function stripShebang(string) {
  if (typeof string !== "string") {
    return ""
  }

  return GenericString.charCodeAt(string, 0) === 35 /* # */
    ? GenericString.replace(string, shebangRegExp, "")
    : string
}

export default stripShebang
