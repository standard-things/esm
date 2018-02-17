import ASCII from "../ascii.js"
import GenericFunction from "../generic/function.js"
import GenericRegExp from "../generic/regexp.js"
import GenericString from "../generic/string.js"

import { lineBreak } from "../acorn/src/whitespace.js"
import wrap from "../util/wrap.js"

const {
  EXMARK,
  GT,
  HYPHEN,
  LT
} = ASCII

const htmlErrorMessage = "HTML comments are not allowed in modules"

function enable(parser) {
  parser.readToken_lt_gt = wrap(parser.readToken_lt_gt, readToken_lt_gt)
  parser.readToken_plus_min = wrap(parser.readToken_plus_min, readToken_plus_min)
  return parser
}

function readToken_lt_gt(func, args) {
  if (this.inModule) {
    const [code] = args
    const { input, pos } = this
    const next = GenericString.charCodeAt(input, pos + 1)

    // Detect opening HTML comment, i.e. `<!--`.
    if (code === LT &&
        next === EXMARK &&
        GenericString.charCodeAt(input, pos + 2) === HYPHEN &&
        GenericString.charCodeAt(input, pos + 3) === HYPHEN) {
      this.raise(pos, htmlErrorMessage)
    }
  }

  return GenericFunction.apply(func, this, args)
}

function readToken_plus_min(func, args) {
  if (this.inModule) {
    const [code] = args
    const { input, lastTokEnd, pos } = this
    const next = GenericString.charCodeAt(input, pos + 1)

    // Detect closing HTML comment, i.e. `-->`.
    if (next === code &&
        next === HYPHEN &&
        GenericString.charCodeAt(input, pos + 2) === GT &&
        (lastTokEnd === 0 ||
          GenericRegExp.test(lineBreak, GenericString.slice(input, lastTokEnd, pos)))) {
      this.raise(pos, htmlErrorMessage)
    }
  }

  return GenericFunction.apply(func, this, args)
}

export { enable }
