var acorn = require("acorn");

exports.options = {
  ecmaVersion: 8,
  sourceType: "module",
  allowImportExportEverywhere: true,
  allowReturnOutsideFunction: true,
  allowHashBang: true
};

function acornParse(code) {
  var parser = new acorn.Parser(exports.options, code);
  parser.strict = false;
  return parser.parse();
}

exports.parse = acornParse;
