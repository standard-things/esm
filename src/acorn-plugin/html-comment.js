import CHAR_CODE from "../constant/char-code.js"

import acorn from "../acorn.js"
import wrap from "../util/wrap.js"

const {
  EXMARK,
  GT,
  HYPHEN,
  LT
} = CHAR_CODE

const htmlErrorMessage = "HTML comments are not allowed in modules"

const { lineBreakRegExp } = acorn

const Plugin = {
  __proto__: null,
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
    if (code === LT &&
        next === EXMARK &&
        input.charCodeAt(pos + 2) === HYPHEN &&
        input.charCodeAt(pos + 3) === HYPHEN) {
      this.raise(pos, htmlErrorMessage)
    }
  }

  return func.apply(this, args)
}

function readToken_plus_min(func, args) {
  if (this.inModule) {
    const [code] = args
    const { input, lastTokEnd, pos } = this
    const next = input.charCodeAt(pos + 1)

    // Detect closing HTML comment, i.e. `-->`.
    if (next === code &&
        next === HYPHEN &&
        input.charCodeAt(pos + 2) === GT &&
        (lastTokEnd === 0 ||
          lineBreakRegExp.test(input.slice(lastTokEnd, pos)))) {
      this.raise(pos, htmlErrorMessage)
    }
  }

  return func.apply(this, args)
}

export default Plugin
