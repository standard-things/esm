import CHAR_CODE from "../constant/char-code.js"

import shared from "../shared.js"

function init() {
  const {
    APOSTROPHE,
    QUOTE
  } = CHAR_CODE

  const unescapeRegExpMap = new Map([
    [APOSTROPHE, /\\'/g],
    [QUOTE, /\\"/g]
  ])

  function unescapeQuotes(string, quoteCode = QUOTE) {
    if (typeof string !== "string") {
      return ""
    }

    const quote = String.fromCharCode(quoteCode)

    return string.replace(unescapeRegExpMap.get(quoteCode), quote)
  }

  return unescapeQuotes
}

export default shared.inited
  ? shared.module.utilUnescapeQuotes
  : shared.module.utilUnescapeQuotes = init()
