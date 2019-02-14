import CHAR_CODE from "../constant/char-code.js"

import shared from "../shared.js"
import unescapeQuotes from "./unescape-quotes.js"

function init() {
  const {
    APOSTROPHE,
    QUOTE
  } = CHAR_CODE

  function stripQuotes(string, quoteCode) {
    if (typeof string !== "string") {
      return ""
    }

    const startCode = string.charCodeAt(0)
    const endCode = string.charCodeAt(string.length - 1)

    if (quoteCode === void 0) {
      if (startCode === APOSTROPHE &&
          endCode === APOSTROPHE) {
        quoteCode = APOSTROPHE
      } else if (startCode === QUOTE &&
                 endCode === QUOTE) {
        quoteCode = QUOTE
      }
    }

    if (quoteCode === void 0) {
      return string
    }

    const unquoted = string.slice(1, -1)

    return unescapeQuotes(unquoted, quoteCode)
  }

  return stripQuotes
}

export default shared.inited
  ? shared.module.utilStripQuotes
  : shared.module.utilStripQuotes = init()
