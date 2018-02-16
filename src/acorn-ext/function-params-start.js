import GenericFunction from "../generic/function.js"

import wrap from "../util/wrap.js"

function enable(parser) {
  parser.parseFunctionParams = wrap(parser.parseFunctionParams, parseFunctionParams)
  return parser
}

function parseFunctionParams(func, args) {
  const [node] = args
  node.functionParamsStart = this.start
  return GenericFunction.apply(func, this, args)
}

export { enable }
