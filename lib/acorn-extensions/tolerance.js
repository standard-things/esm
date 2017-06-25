function enable(parser) {
  // It's not @std/esm's job to enforce strictness.
  parser.strict = false
  // Tolerate recoverable parse errors.
  parser.raiseRecoverable = noopRaiseRecoverable
}

function noopRaiseRecoverable() {}

export { enable }
