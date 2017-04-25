"use strict";

let acorn = null;
let acornExtensions = null;

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
  if (acorn === null) {
    acorn = require("acorn");
  }

  if (acornExtensions === null) {
    acornExtensions = require("./acorn-extensions.js");
  }

  const parser = new acorn.Parser(exports.options, code);

  acornExtensions.enableAll(parser);

  // Override the Parser's parseBlock method.
  parser.parseBlock = quickParseBlock;

  return parser.parse();
}

exports.parse = topLevelParse;
