var acorn = require("acorn");

exports.options = {
  ecmaVersion: 7,
  sourceType: "module",
  allowImportExportEverywhere: true,
  allowReturnOutsideFunction: true,
  allowHashBang: true
};

// Inspired by https://github.com/RReverser/esmod/blob/master/index.js:
function quickParseBlock() {
  var node = this.startNode();
  var length = this.context.length;

  do this.next();
  while (this.context.length >= length);
  this.next();

  node.body = [];

  return this.finishNode(node, "BlockStatement");
}

function topLevelParse(code) {
  var parser = new acorn.Parser(exports.options, code);
  parser.parseBlock = quickParseBlock;
  parser.strict = false;
  return parser.parse();
}

exports.parse = topLevelParse;
