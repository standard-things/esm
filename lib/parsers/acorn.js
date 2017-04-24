"use strict";

const acorn = require("acorn");
const fixParser = require("./acorn-extensions.js").fix;

exports.options = {
  ecmaVersion: 8,
  sourceType: "module",
  allowImportExportEverywhere: true,
  allowReturnOutsideFunction: true,
  allowHashBang: true
};

function acornParse(code) {
  const parser = new acorn.Parser(exports.options, code);
  fixParser(parser);
  return parser.parse();
}

exports.parse = acornParse;
