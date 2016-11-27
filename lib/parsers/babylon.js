var babylon = require("babylon");

exports.options = {
  sourceType: "module",
  strictMode: false,
  allowImportExportEverywhere: true,
  allowReturnOutsideFunction: true,
  plugins: [
    "asyncFunctions",
    "asyncGenerators",
    "classConstructorCall",
    "classProperties",
    "decorators",
    "doExpressions",
    "exponentiationOperator",
    "exportExtensions",
    "flow",
    "functionBind",
    "functionSent",
    "jsx",
    "objectRestSpread",
    "trailingFunctionCommas"
  ]
};

function babylonParse(code) {
  return babylon.parse(code, exports.options);
}

exports.parse = babylonParse;
