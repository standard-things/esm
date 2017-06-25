import { Parser } from "acorn/dist/acorn.es.js"

const Pp = Parser.prototype

function enable(parser) {
  parser.parseMaybeUnary = parseMaybeUnary
}

function parseMaybeUnary(refDestructuringErrors, sawUnary) {
  if (this.isContextual("await")) {
    return this.parseAwait(refDestructuringErrors)
  }
  return Pp.parseMaybeUnary.call(this, refDestructuringErrors, sawUnary)
}

export { enable }
