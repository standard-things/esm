import SOURCE_TYPE from "../../constant/source-type.js"

import Parser from "../../parser.js"

import defaults from "../../util/defaults.js"
import shared from "../../shared.js"

function init() {
  const {
    MODULE,
    SCRIPT
  } = SOURCE_TYPE

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

  return Plugin
}

export default shared.inited
  ? shared.module.acornAcornParse
  : shared.module.acornAcornParse = init()
