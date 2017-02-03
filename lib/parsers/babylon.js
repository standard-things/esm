var babylon = require("babylon");

exports.options = {
  sourceType: "module",
  strictMode: false,
  allowImportExportEverywhere: true,
  allowReturnOutsideFunction: true,
  plugins: ["*", "jsx", "flow"]
};

function babylonParse(code) {
  return babylon.parse(code, exports.options);
}

exports.parse = babylonParse;
