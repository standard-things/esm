import COMPILER from "../../constant/compiler.js"

import Parser from "../../parser.js"

import defaults from "../../util/defaults.js"
import shared from "../../shared.js"

function init() {
  const {
    SOURCE_TYPE_MODULE,
    SOURCE_TYPE_SCRIPT
  } = COMPILER

  const Plugin = {
    enable(acorn) {
      acorn.parse = parse
    }
  }

  function parse(code, options) {
    let ast
    let error
    let threw = true

    options = defaults({
      sourceType: SOURCE_TYPE_MODULE,
      strict: false
    }, options)

    try {
      ast = Parser.parse(code, options)
      threw = false
    } catch (e) {
      error = e
    }

    if (threw) {
      options.sourceType = SOURCE_TYPE_SCRIPT

      try {
        ast = Parser.parse(code, options)
        threw = false
      } catch {}
    }

    if (threw) {
      throw error
    }

    return ast
  }

  return Plugin
}

export default shared.inited
  ? shared.module.acornAcornParse
  : shared.module.acornAcornParse = init()
