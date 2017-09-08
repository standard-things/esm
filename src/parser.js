import AcornParser from "./acorn-parser.js"

import createOptions from "./util/create-options.js"
import { enable as enableAwaitAnywhere } from "./acorn-ext/await-anywhere.js"
import { enable as enableDynamicImport } from "./acorn-ext/dynamic-import.js"
import { enable as enableObjectRestSpread } from "./acorn-ext/object-rest-spread.js"
import { enable as enableTolerance } from "./acorn-ext/tolerance.js"

const defaultOptions = createOptions({
  allowReturnOutsideFunction: false,
  ecmaVersion: 9,
  sourceType: "module"
})

class Parser {
  static defaultOptions = defaultOptions

  static parse(code, options) {
    options = createOptions(options, defaultOptions)
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
