"use strict";

const acorn = require("acorn");
const acornExtensions = require("./acorn-extensions.js");

exports.options = {
  ecmaVersion: 8,
  sourceType: "module",
  allowHashBang: true,
  allowImportExportEverywhere: true,
  allowReturnOutsideFunction: true
};

function acornParse(code) {
  const parser = new acorn.Parser(exports.options, code);
  acornExtensions.enableAll(parser);
  return parser.parse();
}

exports.parse = acornParse;
