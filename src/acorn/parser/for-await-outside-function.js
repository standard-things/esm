import wrap from "../../util/wrap.js"

const Plugin = {
  __proto__: null,
  enable(parser) {
    parser.parseForStatement = wrap(parser.parseForStatement, parseForStatement)
    return parser
  }
}

function parseForStatement(func, args) {
  const { inAsync } = this

  if (! inAsync &&
      ! this.inFunction &&
      this.options.allowAwaitOutsideFunction)  {
    this.inAsync = true
  }

  const result = func.apply(this, args)

  this.inAsync = inAsync
  return result
}

export default Plugin
