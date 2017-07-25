import wrapCall from "../util/wrap-call.js"

const engineDupPrefix = "Duplicate export of '"
const parserDupPrefix = "Duplicate export '"

function enable(parser) {
  parser.raiseRecoverable = wrapCall(parser.raise, raiseRecoverable)
  parser.strict = false
  return parser
}

function raiseRecoverable(func, pos, message) {
  if (message.startsWith(parserDupPrefix)) {
    func.call(this, pos, message.replace(parserDupPrefix, engineDupPrefix))
  }
}

export { enable }
