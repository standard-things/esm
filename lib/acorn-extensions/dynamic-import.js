// A simplified and more accurate version of the dynamic-import acorn plugin.
// Copyright Jordan Gensler. Released under MIT license:
// https://github.com/kesne/acorn-dynamic-import

import { Parser, tokTypes as tt } from "acorn/dist/acorn.es.js"
import utils from "../utils.js"

const Pp = Parser.prototype
const codeOfLeftParen = "(".charCodeAt(0)

function enable(parser) {
  // Allow `yield import()` to parse.
  tt._import.startsExpr = true
  parser.parseExprAtom = parseExprAtom
  parser.parseStatement = parseStatement
}

function parseExprAtom(refDestructuringErrors) {
  const importPos = this.start

  if (this.eat(tt._import)) {
    if (this.type !== tt.parenL) {
      this.unexpected()
    }
    return this.finishNode(this.startNodeAt(importPos), "Import")
  }

  return Pp.parseExprAtom.call(this, refDestructuringErrors)
}

function parseStatement(declaration, topLevel, exported) {
  if (this.type === tt._import &&
      utils.lookahead(this).type === tt.parenL) {
    // import(...)
    const startPos = this.start
    const node = this.startNode()
    const callExpr = this.startNode()
    const callee = this.parseExprAtom()

    this.next()
    callExpr.arguments = [this.parseMaybeAssign()]
    callExpr.callee = callee
    this.finishNode(callExpr, "CallExpression")
    this.expect(tt.parenR)

    const expr = this.parseSubscripts(callExpr, startPos)
    return this.parseExpressionStatement(node, expr)
  }

  return Pp.parseStatement.call(this, declaration, topLevel, exported)
}

export { enable }
