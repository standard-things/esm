"use strict";

// A simplified version of the dynamic-import acorn plugin.
// Copyright Jordan Gensler. Released under MIT license:
// https://github.com/kesne/acorn-dynamic-import

const acorn = require("acorn");

const codeOfLeftParen = "(".charCodeAt(0);
const Parser = acorn.Parser;
const Pp = Parser.prototype;
const tt = acorn.tokTypes;

exports.enable = function (parser) {
  // Allow `yield import()` to parse.
  tt._import.startsExpr = true;
  parser.parseExprAtom = parseExprAtom;
  parser.parseStatement = parseStatement;
};

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
      this.input.charCodeAt(this.pos) === codeOfLeftParen) {
    // import(...)
    return this.parseExpressionStatement(this.startNode(), this.parseExpression());
  }
  return Pp.parseStatement.call(this, declaration, topLevel, exported);
}
