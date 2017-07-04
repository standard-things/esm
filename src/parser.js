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
    let parser = enableAll(new AcornParser(options, code))

    try {
      return parser.parse()
    } catch (e) {
      if (e.reparse === false) {
        throw e
      }
    }

    parser = enableAll(new AcornLooseParser(code, options))
    parser.next()
    return parser.parseTopLevel()
  }
}

Object.setPrototypeOf(Parser.prototype, null)

export default Parser
