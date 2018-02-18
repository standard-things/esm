import wrap from "../util/wrap.js"

function enable(parser) {
  parser.parseFunctionParams = wrap(parser.parseFunctionParams, parseFunctionParams)
  return parser
}

function parseFunctionParams(func, args) {
  const [node] = args
  node.functionParamsStart = this.start
  return func.apply(this, args)
}

export { enable }
