import utils from "../utils.js"

function enable(parser) {
  parser.parseMaybeUnary = utils.wrap(parser.parseMaybeUnary, parseMaybeUnary)
}

function parseMaybeUnary(func, refDestructuringErrors, sawUnary) {
  return this.isContextual("await")
    ? this.parseAwait(refDestructuringErrors)
    : func.call(this, refDestructuringErrors, sawUnary)
}

export { enable }
