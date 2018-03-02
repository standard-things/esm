import { Parser as AcornParser } from "./acorn.js"

import awaitAnywherePlugin from "./acorn-plugin/await-anywhere.js"
import dynamicImportPlugin from "./acorn-plugin/dynamic-import.js"
import functionParamsStartPlugin from "./acorn-plugin/function-params-start.js"
import htmlCommentPlugin from "./acorn-plugin/html-comment.js"
import quickParseBlockPlugin from "./acorn-plugin/quick-parse-block.js"
import toNullObject from "./util/to-null-object.js"
import tolerancePlugin from "./acorn-plugin/tolerance.js"
import topLevelPlugin from "./acorn-plugin/top-level.js"

const defaultOptions = {
  __proto__: null,
  allowReturnOutsideFunction: false,
  ecmaVersion: 9,
  sourceType: "module",
  strict: void 0,
  topLevelOnly: false
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

    if (options.topLevelOnly) {
      quickParseBlockPlugin.enable(parser)
    }

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

export default Parser
