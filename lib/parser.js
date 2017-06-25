import { Parser as AcornParser } from "acorn/dist/acorn.es.js"
import { enableAll } from "./acorn-extensions"

const acornOptions = {
  allowHashBang: true,
  allowImportExportEverywhere: true,
  allowReturnOutsideFunction: true,
  ecmaVersion: 8,
  sourceType: "module"
}

class Parser {
  static parse(code) {
    const parser = new AcornParser(acornOptions, code)
    enableAll(parser)
    return parser.parse()
  }
}

Object.setPrototypeOf(Parser.prototype, null)

export default Parser
