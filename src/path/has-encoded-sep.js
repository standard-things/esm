import ENV from "../constant/env.js"

import shared from "../shared.js"

function init() {
  const {
    WIN32
  } = ENV

  const posixRegExp = /%2f/i
  const win32RegExp = /%5c|%2f/i

  function hasEncodedSep(string) {
    if (typeof string !== "string") {
      return false
    }

    return WIN32
      ? win32RegExp.test(string)
      : posixRegExp.test(string)
  }

  return hasEncodedSep
}

export default shared.inited
  ? shared.module.pathHasEncodedSep
  : shared.module.pathHasEncodedSep = init()
