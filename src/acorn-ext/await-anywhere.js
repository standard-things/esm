import wrap from "../util/wrap.js"

function enable(parser) {
  parser.parseMaybeUnary = wrap(parser.parseMaybeUnary, parseMaybeUnary)
  return parser
}

function parseMaybeUnary(func, args) {
  const refDestructuringErrors = args[0]
  return this.isContextual("await")
    ? this.parseAwait(refDestructuringErrors)
    : func.apply(this, args)
}

export { enable }
