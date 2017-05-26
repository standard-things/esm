"use strict";

const acorn = require("acorn");
const Pp = acorn.Parser.prototype;

function enable(parser) {
  parser.parseMaybeUnary = parseMaybeUnary;
}

exports.enable = enable;

function parseMaybeUnary(refDestructuringErrors, sawUnary) {
  if (this.isContextual("await")) {
    return this.parseAwait(refDestructuringErrors);
  }
  return Pp.parseMaybeUnary.call(this, refDestructuringErrors, sawUnary);
}
