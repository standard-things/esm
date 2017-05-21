"use strict";

// A simplified and more accurate version of the dynamic-import acorn plugin.
// Copyright Jordan Gensler. Released under MIT license:
// https://github.com/kesne/acorn-dynamic-import

const acorn = require("acorn");
const utils = require("./utils.js");

const Pp = acorn.Parser.prototype;
const tt = acorn.tokTypes;

const codeOfLeftParen = "(".charCodeAt(0);

function enable(parser) {
  // Allow `yield import()` to parse.
  tt._import.startsExpr = true;
  parser.parseExprAtom = parseExprAtom;
  parser.parseStatement = parseStatement;
}

exports.enable = enable;

function parseExprAtom(refDestructuringErrors) {
  const importPos = this.start;

  if (this.eat(tt._import)) {
    if (this.type !== tt.parenL) {
      this.unexpected();
    }
    return this.finishNode(this.startNodeAt(importPos), "Import");
  }

  return Pp.parseExprAtom.call(this, refDestructuringErrors);
}

function parseStatement(declaration, topLevel, exported) {
  if (this.type === tt._import &&
      utils.lookahead(this).type === tt.parenL) {
    // import(...)
    const node = this.startNode();
    const exp = this.startNode();
    const callee = this.parseExprAtom();

    this.next();
    exp.arguments = [this.parseMaybeAssign()];
    exp.callee = callee;
    this.finishNode(exp, "CallExpression");
    this.expect(tt.parenR);

    return this.parseExpressionStatement(node, exp);
  }

  return Pp.parseStatement.call(this, declaration, topLevel, exported);
}
