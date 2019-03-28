import { getLineInfo } from "../../acorn.js"
import shared from "../../shared.js"
import wrap from "../../util/wrap.js"

function init() {
  const Plugin = {
    enable(parser) {
      parser.firstReturnOutsideFunction = null
      parser.parseReturnStatement = wrap(parser.parseReturnStatement, parseReturnStatement)

      return parser
    }
  }

  function parseReturnStatement(func, args) {
    if (! this.inFunction &&
        this.firstReturnOutsideFunction === null) {
      this.firstReturnOutsideFunction = getLineInfo(this.input, this.start)
    }

    return Reflect.apply(func, this, args)
  }

  return Plugin
}

export default shared.inited
  ? shared.module.acornParserFirstReturnOutSideFunction
  : shared.module.acornParserFirstReturnOutSideFunction = init()
