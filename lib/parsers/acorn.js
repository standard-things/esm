var acorn = require("acorn-es7-plugin")(require("acorn"));

exports.options = {
  ecmaVersion: 7,
  plugins: {
    asyncawait: true
  },
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
