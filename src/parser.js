import { Parser as AcornParser } from "acorn/dist/acorn.es.js"
import { LooseParser as AcornLooseParser } from "acorn/dist/acorn_loose.es.js"
import { enableAll } from "./acorn-extensions"

const defaultOptions = {
  allowReturnOutsideFunction: false,
  ecmaVersion: 8,
  sourceType: "module"
}

class Parser {
  static parse(code, options) {
    options = Object.assign(Object.create(null), defaultOptions, options)
    let parser = new AcornParser(options, code)
    enableAll(parser)

    try {
      return parser.parse()
    } catch (e) {
      if (e.reparse === false) {
        throw e
      }

      parser = new AcornLooseParser(code, options)
      enableAll(parser)
      parser.next()
      return parser.parseTopLevel()
    }
  }
}

Object.setPrototypeOf(Parser.prototype, null)

export default Parser
