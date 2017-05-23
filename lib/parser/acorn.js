"use strict";

const acorn = require("acorn");
const acornExtensions = require("./acorn-extensions");

exports.options = {
  allowHashBang: true,
  allowImportExportEverywhere: true,
  allowReturnOutsideFunction: true,
  ecmaVersion: 8,
  sourceType: "module"
};

function parse(code) {
  const parser = new acorn.Parser(exports.options, code);
  acornExtensions.enableAll(parser);
  return parser.parse();
}

exports.parse = parse;
