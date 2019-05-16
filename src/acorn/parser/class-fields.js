// A loose implementation of class fields syntax.
// https://github.com/tc39/proposal-class-fields

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
      parser.parseClassElement = wrap(parser.parseClassElement, parseClassElement)

      return parser
    }
  }

  function getTokenFromCode(func, args) {
    const [code] = args

    if (code !== NUMSIGN) {
      return Reflect.apply(func, this, args)
    }

    ++this.pos

    return this.finishToken(tt.name, this.readWord1())
  }

  function parseClassElement(func, args) {
    const { type } = this

    if (type !== tt.bracketL &&
        type !== tt.name) {
      return Reflect.apply(func, this, args)
    }

    const next = lookahead(this)
    const nextType = next.type

    if (nextType === tt.parenL) {
      return Reflect.apply(func, this, args)
    }

    if (nextType !== tt.braceR &&
        nextType !== tt.eq &&
        nextType !== tt.semi) {
      if (this.isContextual("async") ||
          this.isContextual("get") ||
          this.isContextual("set")) {
        return Reflect.apply(func, this, args)
      }

      if (this.isContextual("static")) {
        if (nextType === tt.star) {
          return Reflect.apply(func, this, args)
        }

        const nextNextType = lookahead(next).type

        if (nextNextType !== tt.braceR &&
            nextNextType !== tt.eq &&
            nextNextType !== tt.semi &&
            (next.isContextual("async") ||
             next.isContextual("get") ||
             next.isContextual("set"))) {
          return Reflect.apply(func, this, args)
        }

        next.parsePropertyName(this.startNode())

        if (next.type === tt.parenL) {
          return Reflect.apply(func, this, args)
        }
      }
    }

    const node = this.startNode()

    node.static =
      nextType !== tt.braceR &&
      nextType !== tt.eq &&
      this.eatContextual("static")

    this.parsePropertyName(node)

    node.value = this.eat(tt.eq)
      ? this.parseExpression()
      : null

    this.finishNode(node, "FieldDefinition")
    this.semicolon()

    return node
  }

  return Plugin
}

export default shared.inited
  ? shared.module.acornParserClassFields
  : shared.module.acornParserClassFields = init()
