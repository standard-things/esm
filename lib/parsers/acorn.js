"use strict";

let acorn = null;
let acornExtensions = null;

exports.options = {
  ecmaVersion: 8,
  sourceType: "module",
  allowImportExportEverywhere: true,
  allowReturnOutsideFunction: true,
  allowHashBang: true
};

function acornParse(code) {
  if (acorn === null) {
    acorn = require("acorn");
  }

  if (acornExtensions === null) {
    acornExtensions = require("./acorn-extensions.js");
  }

  const parser = new acorn.Parser(exports.options, code);

  acornExtensions.enableAll(parser);

  return parser.parse();
}

exports.parse = acornParse;
