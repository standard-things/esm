import shared from "../../shared.js"
import wrap from "../../util/wrap.js"

function init() {
  const Plugin = {
    enable(parser) {
      parser.parseFunctionParams = wrap(parser.parseFunctionParams, parseFunctionParams)

      return parser
    }
  }

  function parseFunctionParams(func, args) {
    const [node] = args

    node.functionParamsStart = this.start

    return Reflect.apply(func, this, args)
  }

  return Plugin
}

export default shared.inited
  ? shared.module.acornParserFunctionParamsStart
  : shared.module.acornParserFunctionParamsStart = init()
