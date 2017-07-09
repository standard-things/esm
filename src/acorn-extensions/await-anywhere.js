import utils from "../utils.js"

function enable(parser) {
  parser.parseMaybeUnary = utils.wrapCall(parser.parseMaybeUnary, parseMaybeUnary)
  return parser
}

function parseMaybeUnary(func, refDestructuringErrors, sawUnary) {
  return this.isContextual("await")
    ? this.parseAwait(refDestructuringErrors)
    : func.call(this, refDestructuringErrors, sawUnary)
}

export { enable }
