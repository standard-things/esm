// A loose implementation of numeric separator syntax.
// https://github.com/tc39/proposal-numeric-separator

import CHAR_CODE from "../../constant/char-code.js"

import shared from "../../shared.js"

function init() {
  const {
    DIGIT_0,
    DIGIT_9,
    LOWERCASE_A,
    UNDERSCORE,
    UPPERCASE_A
  } = CHAR_CODE

  const Plugin = {
    enable(parser) {
      parser.readInt = readInt

      return parser
    }
  }

  function readInt(radix, length) {
    const start = this.pos
    const hasLength = typeof length === "number"

    const end = hasLength
      ? length
      : Infinity

    let i = -1
    let total = 0

    while (++i < end) {
      const code = this.input.charCodeAt(this.pos)

      if (code === UNDERSCORE) {
        ++this.pos
        continue
      }

      let value = Infinity

      if (code >= LOWERCASE_A) {
        value = code - LOWERCASE_A + 10
      } else if (code >= UPPERCASE_A) {
        value = code - UPPERCASE_A + 10
      } else if (code >= DIGIT_0 &&
                 code <= DIGIT_9) {
        value = code - DIGIT_0
      }

      if (value >= radix) {
        break
      }

      ++this.pos
      total = (total * radix) + value
    }

    const { pos } = this

    if (pos === start ||
        (hasLength &&
         (pos - start) !== length)) {
      return null
    }

    return total
  }

  return Plugin
}

export default shared.inited
  ? shared.module.acornParserNumericSeparator
  : shared.module.acornParserNumericSeparator = init()
