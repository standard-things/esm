import wrap from "../util/wrap.js"

const parserDupPrefix = "Duplicate export '"
const engineDupPrefix = "Duplicate export of '"

const parserTypePostfix = "may appear only with 'sourceType: module'"
const engineTypePostfix = "may only be used in ES modules"

function enable(parser) {
  parser.checkLVal = wrap(parser.checkLVal, strictWrapper)
  parser.raise = wrap(parser.raise, raise)
  parser.raiseRecoverable = wrap(parser.raise, raiseRecoverable)
  parser.strict = false
  return parser
}

function raise(func, args) {
  const [pos, message] = args

  // Correct message for `let default`:
  // https://github.com/ternjs/acorn/issues/544
  if (message === "The keyword 'let' is reserved") {
    func.call(this, pos, "Unexpected token")
    return
  }

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

function strictWrapper(func, args) {
  this.strict = true

  try {
    return func.apply(this, args)
  } finally {
    this.strict = false
  }
}

export { enable }
