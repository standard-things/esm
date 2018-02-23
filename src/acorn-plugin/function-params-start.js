import wrap from "../util/wrap.js"

const Plugin = {
  __proto__: null,
  enable(parser) {
    parser.parseFunctionParams = wrap(parser.parseFunctionParams, parseFunctionParams)
    return parser
  }
}

function parseFunctionParams(func, args) {
  const [node] = args
  node.functionParamsStart = this.start
  return func.apply(this, args)
}

export default Plugin
