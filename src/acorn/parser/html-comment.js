import CHAR_CODE from "../../constant/char-code.js"
import MESSAGE from "../../constant/message.js"

import acorn from "../../acorn.js"
import shared from "../../shared.js"
import wrap from "../../util/wrap.js"

function init() {
  const {
    EXCLAMATION_MARK,
    HYPHEN_MINUS,
    LEFT_ANGLE_BRACKET,
    RIGHT_ANGLE_BRACKET
  } = CHAR_CODE

  const {
    ILLEGAL_HTML_COMMENT
  } = MESSAGE

  const { lineBreakRegExp } = acorn

  const Plugin = {
    enable(parser) {
      parser.readToken_lt_gt = wrap(parser.readToken_lt_gt, readToken_lt_gt)
      parser.readToken_plus_min = wrap(parser.readToken_plus_min, readToken_plus_min)

      return parser
    }
  }

  function readToken_lt_gt(func, args) {
    if (this.inModule) {
      const [code] = args
      const { input, pos } = this
      const next = input.charCodeAt(pos + 1)

      // Detect opening HTML comment, i.e. `<!--`.
      if (code === LEFT_ANGLE_BRACKET &&
          next === EXCLAMATION_MARK &&
          input.charCodeAt(pos + 2) === HYPHEN_MINUS &&
          input.charCodeAt(pos + 3) === HYPHEN_MINUS) {
        this.raise(pos, ILLEGAL_HTML_COMMENT)
      }
    }

    return Reflect.apply(func, this, args)
  }

  function readToken_plus_min(func, args) {
    if (this.inModule) {
      const [code] = args

      const {
        input,
        lastTokEnd,
        pos
      } = this

      const next = input.charCodeAt(pos + 1)

      // Detect closing HTML comment, i.e. `-->`.
      if (next === code &&
          next === HYPHEN_MINUS &&
          input.charCodeAt(pos + 2) === RIGHT_ANGLE_BRACKET &&
          (lastTokEnd === 0 ||
           lineBreakRegExp.test(input.slice(lastTokEnd, pos)))) {
        this.raise(pos, ILLEGAL_HTML_COMMENT)
      }
    }

    return Reflect.apply(func, this, args)
  }

  return Plugin
}

export default shared.inited
  ? shared.module.acornParserHTMLComment
  : shared.module.acornParserHTMLComment = init()
