import wrapCall from "../util/wrap-call.js"

function enable(parser) {
  parser.raiseRecoverable = wrapCall(parser.raise, raiseRecoverable)
  parser.strict = false
  return parser
}

function raiseRecoverable(func, pos, message) {
  if (message.startsWith("Duplicate export '")) {
    func.call(this, pos, message)
  }
}

export { enable }
