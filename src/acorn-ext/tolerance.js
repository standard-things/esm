import wrap from "../util/wrap.js"

const engineDupPrefix = "Duplicate export of '"
const parserDupPrefix = "Duplicate export '"

function enable(parser) {
  parser.raiseRecoverable = wrap(parser.raise, raiseRecoverable)
  parser.strict = false
  return parser
}

function raiseRecoverable(func, args) {
  const [pos, message] = args

  if (message.startsWith(parserDupPrefix)) {
    func.call(this, pos, message.replace(parserDupPrefix, engineDupPrefix))
  }
}

export { enable }
