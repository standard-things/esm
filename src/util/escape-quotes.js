import CHAR_CODE from "../constant/char-code.js"

import shared from "../shared.js"

function init() {
  const {
    APOSTROPHE,
    QUOTE
  } = CHAR_CODE

  const escapeRegExpMap = new Map([
    [APOSTROPHE, /\\?'/g],
    [QUOTE, /\\?"/g]
  ])

  function escapeQuotes(string, quoteCode = QUOTE) {
    if (typeof string !== "string") {
      return ""
    }

    const quote = String.fromCharCode(quoteCode)

    return string.replace(escapeRegExpMap.get(quoteCode), "\\" + quote)
  }

  return escapeQuotes
}

export default shared.inited
  ? shared.module.utilEscapeQuotes
  : shared.module.utilEscapeQuotes = init()
