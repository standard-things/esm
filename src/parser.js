import SOURCE_TYPE from "./constant/source-type.js"

import { Parser as AcornParser } from "./acorn.js"

import acornPluginAwaitAnywhere from "./acorn/plugin/await-anywhere.js"
import acornPluginDynamicImport from "./acorn/plugin/dynamic-import.js"
import acornPluginFunctionParamsStart from "./acorn/plugin/function-params-start.js"
import acornPluginHTMLComment from "./acorn/plugin/html-comment.js"
import acornPluginTolerance from "./acorn/plugin/tolerance.js"
import acornPluginTopLevel from "./acorn/plugin/top-level.js"
import acornWalkDynamicImport from "./acorn/walk/dynamic-import.js"
import defaults from "./util/defaults.js"
import isInternal from "./env/is-internal.js"
import realRequire from "./real-require.js"
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

      acornPluginAwaitAnywhere.enable(parser)
      acornPluginDynamicImport.enable(parser)
      acornPluginFunctionParamsStart.enable(parser)
      acornPluginHTMLComment.enable(parser)
      acornPluginTolerance.enable(parser)
      acornPluginTopLevel.enable(parser)

      if (strict !== void 0) {
        parser.strict = strict
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

  function internalParse(code, options) {
    let ast
    let error
    let threw = true

    options = defaults({
      ecmaVersion: 9,
      sourceType: MODULE,
      strict: false
    }, options)

    try {
      ast = Parser.parse(code, options)
      threw = false
    } catch (e) {
      error = e
    }

    if (threw) {
      options.sourceType = SCRIPT

      try {
        ast = Parser.parse(code, options)
        threw = false
      } catch (e) {}
    }

    if (threw) {
      throw error
    }

    return ast
  }

  function tryInternalAcornSetup() {
    if (isInternal()) {
      try {
        const acorn = realRequire("internal/deps/acorn/dist/acorn")
        const walk = realRequire("internal/deps/acorn/dist/walk")

        acorn.parse = internalParse
        acornWalkDynamicImport.enable(walk)
      } catch (e) {}
    }
  }

  tryInternalAcornSetup()

  return Parser
}

export default shared.inited
  ? shared.module.Parser
  : shared.module.Parser = init()
