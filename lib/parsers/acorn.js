"use strict";

const acorn = require("acorn");

exports.options = {
  ecmaVersion: 8,
  sourceType: "module",
  allowImportExportEverywhere: true,
  allowReturnOutsideFunction: true,
  allowHashBang: true
};

function acornParse(code) {
  const parser = new acorn.Parser(exports.options, code);

  // It's not Reify's job to enforce strictness.
  parser.strict = false;

  // Tolerate recoverable parse errors.
  parser.raiseRecoverable = noopRaiseRecoverable;

  return parser.parse();
}

function noopRaiseRecoverable() {}

exports.parse = acornParse;
