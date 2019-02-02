import { getLineInfo } from "../../acorn.js"
import lookahead from "../../parse/lookahead.js"
import shared from "../../shared.js"
import wrap from "../../util/wrap.js"

function init() {
  const Plugin = {
    enable(parser) {
      parser.firstAwaitOutsideFunction = null
      parser.parseAwait = wrap(parser.parseAwait, parseAwait)
      parser.parseForStatement = wrap(parser.parseForStatement, parseForStatement)

      return parser
    }
  }

  function parseAwait(func, args) {
    if (! this.inAsync &&
        ! this.inFunction &&
        this.firstAwaitOutsideFunction === null) {
      this.firstAwaitOutsideFunction = getLineInfo(this.input, this.start)
    }

    return Reflect.apply(func, this, args)
  }

  function parseForStatement(func, args) {
    if (this.inAsync ||
        this.inFunction ||
        this.firstAwaitOutsideFunction !== null) {
      return Reflect.apply(func, this, args)
    }

    const [node] = args
    const { start } = lookahead(this)
    const result = Reflect.apply(func, this, args)

    if (node.await &&
        this.firstAwaitOutsideFunction === null) {
      this.firstAwaitOutsideFunction = getLineInfo(this.input, start)
    }

    return result
  }

  return Plugin
}

export default shared.inited
  ? shared.module.acornParserFirstAwaitOutSideFunction
  : shared.module.acornParserFirstAwaitOutSideFunction = init()
