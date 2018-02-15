import shared from "../shared.js"

const posixRegExp = /%2f/i
const win32RegExp = /%5c|%2f/i

function hasEncodedSlash(string) {
  if (typeof string !== "string") {
    return false
  }

  return shared.env.win32
    ? win32RegExp.test(string)
    : posixRegExp.test(string)
}

export default hasEncodedSlash
