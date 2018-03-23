import SOURCE_TYPE from "./constant/source-type.js"

import { Parser as AcornParser } from "./acorn.js"

import acornParserAwaitAnywhere from "./acorn/parser/await-anywhere.js"
import acornParserDynamicImport from "./acorn/parser/dynamic-import.js"
import acornParserFunctionParamsStart from "./acorn/parser/function-params-start.js"
import acornParserHTMLComment from "./acorn/parser/html-comment.js"
import acornParserTolerance from "./acorn/parser/tolerance.js"
import acornParserTopLevel from "./acorn/parser/top-level.js"
import defaults from "./util/defaults.js"
import shared from "./shared.js"

function init() {
  const {
    MODULE,
    SCRIPT
  } = SOURCE_TYPE

  const defaultOptions = {
    __proto__: null,
    allowReturnOutsideFunction: false,
    ecmaVersion: 9,
    sourceType: "module",
    strict: void 0
  }

  const sourceTypeMap = {
    __proto__: null,
    [MODULE]: "module",
    [SCRIPT]: "script"
  }

  const Parser = {
    __proto__: null,
    createOptions,
    defaultOptions,
    parse(code, options) {
      options = Parser.createOptions(options)

      const { strict } = options
      const parser = new AcornParser(options, code)

      acornParserAwaitAnywhere.enable(parser)
      acornParserDynamicImport.enable(parser)
      acornParserFunctionParamsStart.enable(parser)
      acornParserHTMLComment.enable(parser)
      acornParserTolerance.enable(parser)
      acornParserTopLevel.enable(parser)

      if (strict !== void 0) {
        parser.strict = strict

        if (! strict) {
          parser.reservedWords = /^enum$/
        }
      }

      const result = parser.parse()

      result.inModule = parser.inModule
      result.strict = parser.strict
      return result
    }
  }

  function createOptions(value) {
    const options = defaults({ __proto__: null }, value, Parser.defaultOptions)
    const { sourceType } = options

    options.sourceType = sourceTypeMap[sourceType] || sourceType
    return options
  }

  return Parser
}

export default shared.inited
  ? shared.module.Parser
  : shared.module.Parser = init()
