import AcornParser from "./acorn-parser.js"

import _createOptions from "./util/create-options.js"
import { enable as enableAwaitAnywhere } from "./acorn-ext/await-anywhere.js"
import { enable as enableAwaitGenerator } from "./acorn-ext/async-generator.js"
import { enable as enableDynamicImport } from "./acorn-ext/dynamic-import.js"
import { enable as enableFunctionParamsStart } from "./acorn-ext/function-params-start.js"
import { enable as enableHTMLComment } from "./acorn-ext/html-comment.js"
import { enable as enableObjectRestSpread } from "./acorn-ext/object-rest-spread.js"
import { enable as enableTolerance } from "./acorn-ext/tolerance.js"
import { enable as enableTopLevel } from "./acorn-ext/top-level.js"

const defaultOptions = {
  allowReturnOutsideFunction: false,
  ecmaVersion: 9,
  sourceType: "module"
}

class Parser {
  static createOptions = createOptions
  static defaultOptions = defaultOptions

  static parse(code, options) {
    options = Parser.createOptions(options)
    return extend(new AcornParser(options, code)).parse()
  }
}

function createOptions(options) {
  return _createOptions(options, Parser.defaultOptions)
}

function extend(parser) {
  enableAwaitAnywhere(parser)
  enableAwaitGenerator(parser)
  enableDynamicImport(parser)
  enableFunctionParamsStart(parser)
  enableHTMLComment(parser)
  enableObjectRestSpread(parser)
  enableTolerance(parser)
  enableTopLevel(parser)

  return parser
}

Object.setPrototypeOf(Parser.prototype, null)

export default Parser
