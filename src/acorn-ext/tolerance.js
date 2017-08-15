import wrap from "../util/wrap.js"

const parserDupPrefix = "Duplicate export '"
const engineDupPrefix = "Duplicate export of '"

const parserTypePostfix = "may appear only with 'sourceType: module'"
const engineTypePostfix = "may only be used in ES modules"

function enable(parser) {
  parser.raise = wrap(parser.raise, raise)
  parser.raiseRecoverable = wrap(parser.raise, raiseRecoverable)
  return parser
}

function raise(func, args) {
  const [pos, message] = args

  if (message.endsWith(parserTypePostfix)) {
    func.call(this, pos, message.replace(parserTypePostfix, engineTypePostfix))
    return
  }

  func.apply(this, args)
}

function raiseRecoverable(func, args) {
  const [pos, message] = args

  if (message.startsWith(parserDupPrefix)) {
    func.call(this, pos, message.replace(parserDupPrefix, engineDupPrefix))
    return
  }

  if (message.startsWith("Binding ") ||
      message === "new.target can only be used in functions" ||
      message === "The keyword 'await' is reserved") {
    func.call(this, pos, message)
  }
}

export { enable }
