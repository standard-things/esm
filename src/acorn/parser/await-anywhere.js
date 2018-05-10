import shared from "../../shared.js"
import wrap from "../../util/wrap.js"

function init() {
  const Plugin = {
    enable(parser) {
      parser.parseMaybeUnary = wrap(parser.parseMaybeUnary, parseMaybeUnary)
      return parser
    }
  }

  function parseMaybeUnary(func, args) {
    return this.isContextual("await")
      ? this.parseAwait()
      : func.apply(this, args)
  }

  return Plugin
}

export default shared.inited
  ? shared.module.acornParserAwaitAnywhere
  : shared.module.acornParserAwaitAnywhere = init()
