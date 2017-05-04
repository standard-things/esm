"use strict";

const babylon = require("babylon");

exports.options = {
  allowImportExportEverywhere: true,
  allowReturnOutsideFunction: true,
  plugins: ["*", "flow", "jsx"],
  sourceType: "module",
  strictMode: false
};

function parse(code) {
  return babylon.parse(code, exports.options);
}

exports.parse = parse;
