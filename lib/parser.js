var acorn = require("acorn");
var Token = acorn.Token;
var eofTokenType = acorn.tokTypes.eof;
var importTokenType = acorn.tokTypes._import;
var exportTokenType = acorn.tokTypes._export;
var assign = require("./accessor-utils.js").assign;
var Parser = acorn.Parser;
var parserOptions = {
  ecmaVersion: 7,
  sourceType: "module",
  allowImportExportEverywhere: true,
  allowReturnOutsideFunction: true,
  allowHashBang: true
};

// TODO Could this be cached in memory?
exports.parse = function (code) {
  var nodes = [];

  if (! /\b(import|export)\b/.test(code)) {
    return nodes;
  }

  var parser = new Parser(parserOptions, code);
  parser.next();

  while (parser.type !== eofTokenType) {
    if (parser.type === importTokenType ||
        parser.type === exportTokenType) {
      var clone = Object.create(parser);
      var node = parseOrNull(clone);
      if (node && (node.type === "ImportDeclaration" ||
                   node.type === "ExportAllDeclaration" ||
                   node.type === "ExportNamedDeclaration")) {
        nodes.push(node);
        assign(parser, clone);
        continue;
      }
    }
    parser.next();
  }

  return nodes;
};

function parseOrNull(parser) {
  var node = parser.startNode();
  try {
    if (parser.type === importTokenType) {
      return parser.parseImport(node);
    }
    if (parser.type === exportTokenType) {
      return parser.parseExport(node);
    }
  } catch (e) {}
  return null;
}
