import wrap from "../../util/wrap.js"

const Plugin = {
  __proto__: null,
  enable(parser) {
    parser.parseForStatement = wrap(parser.parseForStatement, parseForStatement)
    return parser
  }
}

function parseForStatement(func, args) {
  if (! this.inAsync &&
      ! this.inFunction &&
      this.options.allowAwaitOutsideFunction)  {
    this.inAsync = true
  }

  return func.apply(this, args)
}

export default Plugin
