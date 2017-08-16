// A simplified and more accurate version of the dynamic import acorn plugin.
// Copyright Jordan Gensler. Released under MIT license:
// https://github.com/kesne/acorn-dynamic-import

import lookahead from "../parse/lookahead.js"
import { types as tt } from "../vendor/acorn/src/tokentype.js"
import unexpected from "../parse/unexpected.js"
import wrap from "../util/wrap.js"

function enable(parser) {
  // Allow `yield import()` to parse.
  tt._import.startsExpr = true
  parser.parseExprAtom = wrap(parser.parseExprAtom, parseExprAtom)
  parser.parseStatement = wrap(parser.parseStatement, parseStatement)
  return parser
}

function parseExprAtom(func, args) {
  const importPos = this.start

  if (this.eat(tt._import)) {
    if (this.type !== tt.parenL) {
      unexpected(this)
    }

    return this.finishNode(this.startNodeAt(importPos), "Import")
  }

  return func.apply(this, args)
}

function parseStatement(func, args) {
  if (this.type === tt._import &&
      lookahead(this).type === tt.parenL) {
    // import(...)
    const startPos = this.start
    const node = this.startNode()
    const callExpr = this.startNode()
    const callee = this.parseExprAtom()

    this.next()

    callExpr.arguments = [this.parseMaybeAssign()]
    callExpr.callee = callee
    this.finishNode(callExpr, "CallExpression")

    if (! this.eat(tt.parenR)) {
      unexpected(this)
    }

    const expr = this.parseSubscripts(callExpr, startPos)
    return this.parseExpressionStatement(node, expr)
  }

  return func.apply(this, args)
}

export { enable }
