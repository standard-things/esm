import GenericFunction from "../generic/function.js"

import wrap from "../util/wrap.js"

function enable(parser) {
  parser.parseMaybeUnary = wrap(parser.parseMaybeUnary, parseMaybeUnary)
  return parser
}

function parseMaybeUnary(func, args) {
  return this.isContextual("await")
    ? this.parseAwait()
    : GenericFunction.apply(func, this, args)
}

export { enable }
