import wrap from "../util/wrap.js"

function enable(parser) {
  parser.parseMaybeUnary = wrap(parser.parseMaybeUnary, parseMaybeUnary)
  return parser
}

function parseMaybeUnary(func, args) {
  return this.isContextual("await")
    ? this.parseAwait()
    : func.apply(this, args)
}

export default enable
