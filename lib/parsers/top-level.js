"use strict";

const acorn = require("acorn");

exports.options = {
  ecmaVersion: 8,
  sourceType: "module",
  allowImportExportEverywhere: true,
  allowReturnOutsideFunction: true,
  allowHashBang: true
};

// Inspired by https://github.com/RReverser/esmod/blob/master/index.js:
function quickParseBlock() {
  const node = this.startNode();
  const length = this.context.length;

  do this.next();
  while (this.context.length >= length);
  this.next();

  node.body = [];

  return this.finishNode(node, "BlockStatement");
}

function topLevelParse(code) {
  const parser = new acorn.Parser(exports.options, code);

  // Override the Parser's parseBlock method.
  parser.parseBlock = quickParseBlock;

  // It's not Reify's job to enforce strictness.
  parser.strict = false;

  // Tolerate recoverable parse errors.
  parser.raiseRecoverable = noopRaiseRecoverable;

  return parser.parse();
}

function noopRaiseRecoverable() {}

exports.parse = topLevelParse;
