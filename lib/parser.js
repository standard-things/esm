"use strict"

const acorn = require("acorn")
const acornExtensions = require("./acorn-extensions")
const acornOptions = {
  allowHashBang: true,
  allowImportExportEverywhere: true,
  allowReturnOutsideFunction: true,
  ecmaVersion: 8,
  sourceType: "module"
}

class Parser {
  static parse(code) {
    const parser = new acorn.Parser(acornOptions, code)
    acornExtensions.enableAll(parser)
    return parser.parse()
  }
}

Object.setPrototypeOf(Parser.prototype, null)

module.exports = Parser
