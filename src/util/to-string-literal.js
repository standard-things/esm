import CHAR_CODE from "../constant/char-code.js"

const {
  QUOTE
} = CHAR_CODE

const escapedDoubleQuoteRegExp = /\\"/g

/* eslint-disable sort-keys */
const escapeRegExpMap = {
  __proto__: null,
  '"': /\\?"/g,
  "'": /\\?'/g,
  "`": /\\?`/g
}

/* eslint-disable sort-keys */
const quoteMap = {
  __proto__: null,
  '"': '"',
  "'": "'",
  "`": "`",
  back: "`",
  double: '"',
  single: "'"
}

function toStringLiteral(value, style = '"') {
  const quote = quoteMap[style] || '"'
  const string = JSON.stringify(value)

  if (quote === '"' &&
      string.charCodeAt(0) === QUOTE) {
    return string
  }

  const unquoted = string.slice(1, -1)
  const escaped = unquoted.replace(escapedDoubleQuoteRegExp, '"')

  return quote + escaped.replace(escapeRegExpMap[quote], "\\" + quote) + quote
}

export default toStringLiteral
