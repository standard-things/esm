function enable(parser) {
  parser.raiseRecoverable = noopRaiseRecoverable
  parser.strict = false
  return parser
}

function noopRaiseRecoverable() {}

export { enable }
