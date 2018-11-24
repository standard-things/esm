import CHAR_CODE from "../constant/char-code.js"
import toString from "./to-string.js"
import shared from "../shared.js"

function init() {
  const {
    QUOTE
  } = CHAR_CODE

  const escapedDoubleQuoteRegExp = /\\"/g

  const escapeRegExpMap = new Map([
    ['"', /\\?"/g],
    ["'", /\\?'/g],
    ["`", /\\?`/g]
  ])

  const quoteMap = new Map([
    ['"', '"'],
    ["'", "'"],
    ["`", "`"],
    ["back", "`"],
    ["double", '"'],
    ["single", "'"]
  ])

  function toStringLiteral(value, style = '"') {
    const quote = quoteMap.get(style) || '"'
    const string = JSON.stringify(value) || toString(value)

    if (quote === '"' &&
        string.charCodeAt(0) === QUOTE) {
      return string
    }

    const unquoted = string.slice(1, -1)
    const escaped = unquoted.replace(escapedDoubleQuoteRegExp, '"')

    return quote + escaped.replace(escapeRegExpMap.get(quote), "\\" + quote) + quote
  }

  return toStringLiteral
}

export default shared.inited
  ? shared.module.utilToStringLiteral
  : shared.module.utilToStringLiteral = init()
