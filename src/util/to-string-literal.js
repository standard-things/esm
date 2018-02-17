import ASCII from "../ascii.js"
import GenericString from "../generic/string.js"
import SafeJSON from "../builtin/json.js"

const {
  QUOTE
} = ASCII

const escapedDoubleQuoteRegExp = /\\"/g

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

function toStringLiteral(value, style = '"') {
  const quote = quoteMap[style] || '"'
  const string = SafeJSON.stringify(value)

  if (quote === '"' &&
      GenericString.charCodeAt(string, 0) === QUOTE) {
    return string
  }

  const unquoted = GenericString.slice(string, 1, -1)
  const escaped = GenericString.replace(unquoted, escapedDoubleQuoteRegExp, '"')

  return quote + GenericString.replace(escaped, escapeRegExpMap[quote], "\\" + quote) + quote
}

export default toStringLiteral
