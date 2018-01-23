const shebangRegExp = /^#!.*/

function stripShebang(string) {
  if (typeof string !== "string") {
    return ""
  }

  return string.charCodeAt(0) === 35 /* # */
    ? string.replace(shebangRegExp, "")
    : string
}

export default stripShebang
