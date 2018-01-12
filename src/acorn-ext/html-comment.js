import { lineBreak } from "../vendor/acorn/src/whitespace.js"
import wrap from "../util/wrap.js"

const codeOfBang = "!".charCodeAt(0)
const codeOfDash = "-".charCodeAt(0)
const codeOfGT = ">".charCodeAt(0)
const codeOfLT = "<".charCodeAt(0)

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
    const next = input.charCodeAt(pos + 1)

    // Detect opening HTML comment, i.e. `<!--`.
    if (code === codeOfLT &&
        next === codeOfBang &&
        input.charCodeAt(pos + 2) === codeOfDash &&
        input.charCodeAt(pos + 3) === codeOfDash) {
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
        next === codeOfDash &&
        input.charCodeAt(pos + 2) === codeOfGT &&
        (lastTokEnd === 0 || lineBreak.test(input.slice(lastTokEnd, pos)))) {
      this.raise(pos, htmlErrorMessage)
    }
  }

  return func.apply(this, args)
}

export { enable }
