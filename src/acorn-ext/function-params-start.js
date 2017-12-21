import wrap from "../util/wrap.js"

function enable(parser) {
  parser.parseFunctionParams = wrap(parser.parseFunctionParams, parseFunctionParams)
  return parser
}

function parseFunctionParams(func, [ node ]) {
  node.functionParamsStart = this.start
  return func.call(this, node)
}

export { enable }
