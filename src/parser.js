import COMPILER from "./constant/compiler.js"

import {
  Parser as AcornParser,
  createWordsRegExp,
  reservedWords
} from "./acorn.js"

import acornParserBigInt from "./acorn/parser/big-int.js"
import acornParserClassFields from "./acorn/parser/class-fields.js"
import acornParserErrorMessages from "./acorn/parser/error-messages.js"
import acornParserFirstAwaitOutsideFunction from "./acorn/parser/first-await-outside-function.js"
import acornParserFirstReturnOutsideFunction from "./acorn/parser/first-return-outside-function.js"
import acornParserFunctionParamsStart from "./acorn/parser/function-params-start.js"
import acornParserHTMLComment from "./acorn/parser/html-comment.js"
import acornParserImport from "./acorn/parser/import.js"
import acornParserNumericSeparator from "./acorn/parser/numeric-separator.js"
import acornParserRaw from "./acorn/parser/raw.js"
import acornParserTolerance from "./acorn/parser/tolerance.js"
import acornParserTopLevel from "./acorn/parser/top-level.js"
import defaults from "./util/defaults.js"
import shared from "./shared.js"

function init() {
  const {
    SOURCE_TYPE_MODULE,
    SOURCE_TYPE_SCRIPT
  } = COMPILER

  const reservedWordsRegExp = createWordsRegExp(reservedWords[6])

  const defaultOptions = {
    allowAwaitOutsideFunction: true,
    allowReturnOutsideFunction: false,
    ecmaVersion: 10,
    sourceType: "module",
    strict: void 0
  }

  const sourceTypeMap = new Map([
    [SOURCE_TYPE_MODULE, "module"],
    [SOURCE_TYPE_SCRIPT, "script"]
  ])

  const Parser = {
    create,
    createOptions,
    defaultOptions,
    parse(code, options) {
      const parser = Parser.create(code, options)
      const result = parser.parse()

      result.inModule = parser.inModule
      result.strict = parser.strict

      return result
    }
  }

  function create(code, options) {
    options = Parser.createOptions(options)

    const { strict } = options
    const parser = new AcornParser(options, code)

    acornParserBigInt.enable(parser)
    acornParserClassFields.enable(parser)
    acornParserErrorMessages.enable(parser)
    acornParserFirstAwaitOutsideFunction.enable(parser)
    acornParserFirstReturnOutsideFunction.enable(parser)
    acornParserFunctionParamsStart.enable(parser)
    acornParserHTMLComment.enable(parser)
    acornParserImport.enable(parser)
    acornParserNumericSeparator.enable(parser)
    acornParserRaw.enable(parser)
    acornParserTolerance.enable(parser)
    acornParserTopLevel.enable(parser)

    if (strict !== void 0) {
      parser.strict = !! strict

      if (! parser.strict) {
        parser.reservedWords = reservedWordsRegExp
      }
    }

    return parser
  }

  function createOptions(value) {
    const options = defaults({}, value, Parser.defaultOptions)

    let { sourceType } = options
    let resolvedType = sourceTypeMap.get(sourceType)

    if (resolvedType !== void 0) {
      sourceType = resolvedType
    }

    options.sourceType = sourceType

    return options
  }

  return Parser
}

export default shared.inited
  ? shared.module.Parser
  : shared.module.Parser = init()
