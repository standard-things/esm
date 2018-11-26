import CHAR_CODE from "../constant/char-code.js"

import toString from "./to-string.js"
import shared from "../shared.js"

function init() {
  const {
    QUOTE
  } = CHAR_CODE

  const escapedDoubleQuoteRegExp = /\\"/g
  const separatorsRegExp = /[\u2028\u2029]/g

  const escapeRegExpMap = new Map([
    ['"', /\\?"/g],
    ["'", /\\?'/g],
    ["`", /\\?`/g]
  ])

  const escapeSeparatorsMap = new Map([
    ["\u2028", "\\u2028"],
    ["\u2029", "\\u2029"]
  ])

  function toStringLiteral(value, quote = '"') {
    let string = JSON.stringify(value)

    if (typeof string !== "string") {
      string = toString(value)
    }

    string = string.replace(separatorsRegExp, replaceSeparators)

    if (quote === '"' &&
        string.charCodeAt(0) === QUOTE) {
      return string
    }

    const unquoted = string.slice(1, -1)
    const unescaped = unquoted.replace(escapedDoubleQuoteRegExp, '"')
    const escaped = unescaped.replace(escapeRegExpMap.get(quote), "\\" + quote)

    return quote + escaped + quote
  }

  function replaceSeparators(match) {
    return "\\" + escapeSeparatorsMap.get(match)
  }

  return toStringLiteral
}

export default shared.inited
  ? shared.module.utilToStringLiteral
  : shared.module.utilToStringLiteral = init()
