import wrap from "../util/wrap.js"

const Plugin = {
  __proto__: null,
  enable(parser) {
    parser.parseMaybeUnary = wrap(parser.parseMaybeUnary, parseMaybeUnary)
    return parser
  }
}

function parseMaybeUnary(func, args) {
  return this.isContextual("await")
    ? this.parseAwait()
    : func.apply(this, args)
}

export default Plugin
