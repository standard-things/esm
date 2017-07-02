import { Parser as AcornParser } from "acorn/dist/acorn.es.js"
import { enableAll } from "./acorn-extensions"

const defaultOptions = {
  allowHashBang: true,
  allowImportExportEverywhere: true,
  allowReturnOutsideFunction: false,
  ecmaVersion: 8,
  sourceType: "module"
}

class Parser {
  static parse(code, options) {
    options = Object.assign(Object.create(null), defaultOptions, options)
    const parser = new AcornParser(options, code)
    enableAll(parser)
    return parser.parse()
  }
}

Object.setPrototypeOf(Parser.prototype, null)

export default Parser
