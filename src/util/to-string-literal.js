import createOptions from "./create-options.js"
import toString from "./to-string.js"

const codeOfDoubleQuote = '"'.charCodeAt(0)

const { stringify } = JSON

const escapedDoubleQuoteRegExp = /\\"/g

const escapeRegExpMap = createOptions({
  "'": /\\?'/g,
  "`": /\\?`/g
})

const quoteMap = createOptions({
  '"': '"',
  "'": "'",
  "`": "`",
  "back": "`",
  "double": '"',
  "single": "'"
})

function toStringLiteral(value, style = '"') {
  const quote = quoteMap[style] || '"'
  const string = stringify(toString(value))

  if (quote === '"' &&
      string.charCodeAt(0) === codeOfDoubleQuote) {
    return string
  }

  const unquoted = string.slice(1, -1).replace(escapedDoubleQuoteRegExp, '"')
  return quote + unquoted.replace(escapeRegExpMap[quote], "\\" + quote) + quote
}

export default toStringLiteral
