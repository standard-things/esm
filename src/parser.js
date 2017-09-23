import AcornParser from "./acorn-parser.js"

import _createOptions from "./util/create-options.js"
import { enable as enableAwaitAnywhere } from "./acorn-ext/await-anywhere.js"
import { enable as enableDynamicImport } from "./acorn-ext/dynamic-import.js"
import { enable as enableObjectRestSpread } from "./acorn-ext/object-rest-spread.js"
import { enable as enableTolerance } from "./acorn-ext/tolerance.js"

const defaultOptions = {
  allowReturnOutsideFunction: false,
  ecmaVersion: 9,
  sourceType: "module"
}

const createOptions = (options) => _createOptions(options, Parser.defaultOptions)

class Parser {
  static createOptions = createOptions
  static defaultOptions = defaultOptions

  static parse(code, options) {
    options = Parser.createOptions(options)
    return extend(new AcornParser(options, code)).parse()
  }
}

function extend(parser) {
  enableAwaitAnywhere(parser)
  enableDynamicImport(parser)
  enableObjectRestSpread(parser)
  enableTolerance(parser)

  return parser
}

Object.setPrototypeOf(Parser.prototype, null)

export default Parser
