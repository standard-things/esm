import wrap from "../util/wrap.js"

const engineDupPrefix = "Duplicate export of '"
const parserDupPrefix = "Duplicate export '"

function enable(parser) {
  parser.raiseRecoverable = wrap(parser.raise, raiseRecoverable)
  return parser
}

function raiseRecoverable(func, args) {
  const [pos, message] = args

  if (message.startsWith(parserDupPrefix)) {
    func.call(this, pos, message.replace(parserDupPrefix, engineDupPrefix))
  }

  if (message.startsWith("Binding ") ||
      message === "new.target can only be used in functions" ||
      message === "The keyword 'await' is reserved") {
    func.call(this, pos, message)
  }
}

export { enable }
