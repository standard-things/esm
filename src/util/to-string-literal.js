import toString from "./to-string.js"

const escapeRegExpMap = {
  "'": /\\?'/g,
  "`": /\\?`/g
}

const quoteMap = {
  '"': '"',
  "'": "'",
  "`": "`",
  "back": "`",
  "double": '"',
  "single": "'"
}

const codeOfDoubleQuote = '"'.charCodeAt(0)
const escapedDoubleQuoteRegExp = /\\"/g

function toStringLiteral(value, style = '"') {
  const quote = quoteMap[style] || '"'
  const string = JSON.stringify(toString(value))

  if (quote === '"' &&
      string.charCodeAt(0) === codeOfDoubleQuote) {
    return string
  }

  const unquoted = string.slice(1, -1).replace(escapedDoubleQuoteRegExp, '"')
  return quote + unquoted.replace(escapeRegExpMap[quote], "\\" + quote) + quote
}

export default toStringLiteral
