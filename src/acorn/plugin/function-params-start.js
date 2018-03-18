import shared from "../../shared.js"
import wrap from "../../util/wrap.js"

function init() {
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

  return Plugin
}

export default shared.inited
  ? shared.module.acornPluginFunctionParamsStart
  : shared.module.acornPluginFunctionParamsStart = init()
