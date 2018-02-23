import { Parser as AcornParser } from "./acorn.js"

import enableAwaitAnywhere from "./acorn-ext/await-anywhere.js"
import enableDynamicImport from "./acorn-ext/dynamic-import.js"
import enableFunctionParamsStart from "./acorn-ext/function-params-start.js"
import enableHTMLComment from "./acorn-ext/html-comment.js"
import enableTolerance from "./acorn-ext/tolerance.js"
import enableTopLevel from "./acorn-ext/top-level.js"
import toNullObject from "./util/to-null-object.js"

const defaultOptions = {
  __proto__: null,
  allowReturnOutsideFunction: false,
  ecmaVersion: 9,
  sourceType: "module",
  strict: void 0
}

class Parser {
  static createOptions = createOptions
  static defaultOptions = defaultOptions

  static parse(code, options) {
    options = Parser.createOptions(options)

    const { strict } = options
    const parser = new AcornParser(options, code)

    enableAwaitAnywhere(parser)
    enableDynamicImport(parser)
    enableFunctionParamsStart(parser)
    enableHTMLComment(parser)
    enableTolerance(parser)
    enableTopLevel(parser)

    if (strict !== void 0) {
      parser.strict = strict
    }

    const result = parser.parse()

    result.inModule = parser.inModule
    result.strict = parser.strict
    return result
  }
}

function createOptions(options) {
  return toNullObject(options, Parser.defaultOptions)
}

Object.setPrototypeOf(Parser.prototype, null)

export default Parser
