// A loose implementation of class fields syntax.
// https://github.com/tc39/proposal-class-fields
// https://github.com/tc39/proposal-static-class-features

import CHAR_CODE from "../../constant/char-code.js"

import branch from "../../parse/branch.js"
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

    const branched1 = branch(this)
    const dummyNode = this.startNode()

    branched1.parsePropertyName(dummyNode)

    const branched1Type = branched1.type

    if (branched1Type === tt.parenL) {
      return Reflect.apply(func, this, args)
    }

    if (branched1Type !== tt.braceR &&
        branched1Type !== tt.eq &&
        branched1Type !== tt.semi) {
      if (this.isContextual("async") ||
          this.isContextual("get") ||
          this.isContextual("set")) {
        return Reflect.apply(func, this, args)
      }

      if (this.isContextual("static")) {
        if (branched1Type !== tt.bracketL &&
            branched1Type !== tt.name) {
          return Reflect.apply(func, this, args)
        }

        const branched2 = branch(branched1)

        branched2.parsePropertyName(dummyNode)

        const branched2Type = branched2.type

        if (branched2Type === tt.parenL) {
          return Reflect.apply(func, this, args)
        }

        if (branched2Type !== tt.braceR &&
            branched2Type !== tt.eq &&
            branched2Type !== tt.semi &&
            (branched1.isContextual("async") ||
             branched1.isContextual("get") ||
             branched1.isContextual("set"))) {
          return Reflect.apply(func, this, args)
        }
      }
    }

    const node = this.startNode()

    node.static =
      branched1Type !== tt.braceR &&
      branched1Type !== tt.eq &&
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
