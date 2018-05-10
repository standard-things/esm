import CHAR_CODE from "../../constant/char-code.js"

import lookahead from "../../parse/lookahead.js"
import shared from "../../shared.js"
import { tokTypes as tt } from "../../acorn.js"
import wrap from "../../util/wrap.js"

function init() {
  const {
    NUMSIGN
  } = CHAR_CODE

  const Plugin = {
    enable(parser) {
      parser.getTokenFromCode = wrap(parser.getTokenFromCode, getTokenFromCode)
      parser.parseClassMember = wrap(parser.parseClassMember, parseClassMember)
      return parser
    }
  }

  function getTokenFromCode(func, args) {
    const [code] = args

    if (code !== NUMSIGN) {
      return func.apply(this, args)
    }

    ++this.pos
    return this.finishToken(tt.name, this.readWord1())
  }

  function parseClassMember(func, args) {
    if (this.type !== tt.name) {
      return func.apply(this, args)
    }

    const { type } = lookahead(this)

    if (type === tt.parenL ||
        type === tt.star ||
        (type !== tt.braceR &&
         type !== tt.eq &&
         type !== tt.semi &&
         (this.isContextual("async") ||
          this.isContextual("get") ||
          this.isContextual("set") ||
          this.isContextual("static")))) {
      return func.apply(this, args)
    }

    const [classBody] = args
    const node = this.startNode()

    node.key = this.parseIdent(true)
    node.computed = false
    node.value = this.eat(tt.eq) ? this.parseExpression() : null

    this.finishNode(node, "FieldDefinition")
    classBody.body.push(node)
    this.semicolon()
    return node
  }

  return Plugin
}

export default shared.inited
  ? shared.module.acornParserClassFields
  : shared.module.acornParserClassFields = init()
