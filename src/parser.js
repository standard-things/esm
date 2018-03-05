import SOURCE_TYPE from "./constant/source-type.js"

import { Parser as AcornParser } from "./acorn.js"

import awaitAnywherePlugin from "./acorn-plugin/await-anywhere.js"
import defaults from "./util/defaults.js"
import dynamicImportPlugin from "./acorn-plugin/dynamic-import.js"
import functionParamsStartPlugin from "./acorn-plugin/function-params-start.js"
import htmlCommentPlugin from "./acorn-plugin/html-comment.js"
import tolerancePlugin from "./acorn-plugin/tolerance.js"
import topLevelPlugin from "./acorn-plugin/top-level.js"

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

    awaitAnywherePlugin.enable(parser)
    dynamicImportPlugin.enable(parser)
    functionParamsStartPlugin.enable(parser)
    htmlCommentPlugin.enable(parser)
    tolerancePlugin.enable(parser)
    topLevelPlugin.enable(parser)

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
  options = defaults({ __proto__: null }, options, Parser.defaultOptions)

  const { sourceType } = options

  options.sourceType = sourceTypeMap[sourceType] || sourceType
  return options
}

export default Parser
