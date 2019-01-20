import CHAR_CODE from "../constant/char-code.js"

import shared from "../shared.js"

function init() {
  const {
    APOSTROPHE,
    QUOTE
  } = CHAR_CODE

  const escapedDoubleQuoteRegExp = /\\"/g
  const escapedSingleQuoteRegExp = /\\'/g

  function stripQuotes(string) {
    if (typeof string !== "string") {
      return ""
    }

    const startCode = string.charCodeAt(0)
    const endCode = string.charCodeAt(string.length - 1)

    const isDoubleQuoted =
      startCode === QUOTE &&
      endCode === QUOTE

    const isSingleQuoted =
      startCode === APOSTROPHE &&
      endCode === APOSTROPHE

    if (! isDoubleQuoted &&
        ! isSingleQuoted) {
      return string
    }

    const unquoted = string.slice(1, -1)

    return isDoubleQuoted
      ? unquoted.replace(escapedDoubleQuoteRegExp, '"')
      : unquoted.replace(escapedSingleQuoteRegExp, "'")
  }

  return stripQuotes
}

export default shared.inited
  ? shared.module.utilStripQuotes
  : shared.module.utilStripQuotes = init()
