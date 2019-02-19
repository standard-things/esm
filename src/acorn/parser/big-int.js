// A loose implementation of BigInt syntax.
// https://github.com/tc39/proposal-bigint

import CHAR_CODE from "../../constant/char-code.js"

import shared from "../../shared.js"
import { tokTypes as tt } from "../../acorn.js"
import wrap from "../../util/wrap.js"

function init() {
  const {
    LOWERCASE_N
  } = CHAR_CODE

  const Plugin = {
    enable(parser) {
      parser.readNumber = wrap(parser.readNumber, readNumber)
      parser.readRadixNumber = wrap(parser.readRadixNumber, readRadixNumber)

      return parser
    }
  }

  function readBigInt(parser, radix) {
    const { pos } = parser

    if (typeof radix === "number") {
      parser.pos += 2
    } else {
      radix = 10
    }

    if (parser.readInt(radix) !== null &&
        parser.input.charCodeAt(parser.pos) === LOWERCASE_N) {
      ++parser.pos

      return parser.finishToken(tt.num, null)
    }

    parser.pos = pos

    return null
  }

  function readNumber(func, args) {
    const [startsWithDot] = args

    if (! startsWithDot) {
      const result = readBigInt(this)

      if (result !== null) {
        return result
      }
    }

    return Reflect.apply(func, this, args)
  }

  function readRadixNumber(func, args) {
    const [radix] = args
    const result = readBigInt(this, radix)

    return result === null
      ? Reflect.apply(func, this, args)
      : result
  }

  return Plugin
}

export default shared.inited
  ? shared.module.acornParserBigInt
  : shared.module.acornParserBigInt = init()
