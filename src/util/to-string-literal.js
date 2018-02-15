import SafeJSON from "../builtin/json.js"

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
      string.charCodeAt(0) === 34 /* " */) {
    return string
  }

  const unquoted = string.slice(1, -1).replace(escapedDoubleQuoteRegExp, '"')
  return quote + unquoted.replace(escapeRegExpMap[quote], "\\" + quote) + quote
}

export default toStringLiteral
