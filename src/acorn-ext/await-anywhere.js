import wrapCall from "../util/wrap-call.js"

function enable(parser) {
  parser.parseMaybeUnary = wrapCall(parser.parseMaybeUnary, parseMaybeUnary)
  return parser
}

function parseMaybeUnary(func, refDestructuringErrors, sawUnary) {
  return this.isContextual("await")
    ? this.parseAwait(refDestructuringErrors)
    : func.call(this, refDestructuringErrors, sawUnary)
}

export { enable }
