import CHAR_CODE from "../../constant/char-code.js"
import COMPILER from "../../constant/compiler.js"

import createInlineSourceMap from "../../util/create-inline-source-map.js"
import shared from "../../shared.js"
import stripShebang from "../../util/strip-shebang.js"

function init() {
  const {
    SEMICOLON
  } = CHAR_CODE

  const {
    SOURCE_TYPE_MODULE
  } = COMPILER

  function compileSource(compileData, options = {}) {
    const compile = compileData.sourceType === SOURCE_TYPE_MODULE
      ? compileESM
      : compileCJS

    return compile(compileData, options)
  }

  function compileCJS(compileData, options) {
    let { async } = options
    let changed = compileData.transforms !== 0
    let content = compileData.code

    if (changed) {
      const returnRun = compileData.firstReturnOutsideFunction !== null
      const { runtimeName } = options

      if (compileData.firstAwaitOutsideFunction === null) {
        async = false
      }

      content =
        "const " + runtimeName + "=exports;" +
        (returnRun
          ? "return "
          : ""
        ) +
        runtimeName + ".r((" +
        (async
          ? "async "
          :  ""
        ) +
        "function(exports,require){" +
        content +
        "\n}))"
    } else if (async) {
      changed = true
      content =
        "(async () => { " +
        stripShebang(content) +
        "\n})();"
    }

    if (changed &&
        options.sourceMap) {
      content += createInlineSourceMap(compileData.filename, content)
    }

    return content
  }

  function compileESM(compileData, options) {
    const { cjsVars, runtimeName } = options
    const returnRun = compileData.firstReturnOutsideFunction !== null
    const yieldCode = "yield;" + runtimeName + ".s();"
    const { yieldIndex } = compileData

    let { async } = options

    if (compileData.firstAwaitOutsideFunction === null) {
      async = false
    }

    let { code } = compileData

    if (compileData.transforms === 0) {
      code = stripShebang(code)
    }

    if (yieldIndex !== -1) {
      if (yieldIndex === 0) {
        code = yieldCode + code
      } else {
        code =
          code.slice(0, yieldIndex) +
          (code.charCodeAt(yieldIndex - 1) === SEMICOLON
            ? ""
            : ";"
          ) +
          yieldCode +
          code.slice(yieldIndex)
      }
    }

    let content =
      "const " + runtimeName + "=exports;" +
      (cjsVars
        ? ""
        : "__dirname=__filename=arguments=exports=module=require=void 0;"
      ) +
      (returnRun
        ? "return "
        : ""
      ) +
      runtimeName + ".r((" +
      (async
        ? "async "
        :  ""
      ) +
      "function *" +
      "(" +
      (cjsVars
        ? "exports,require"
        : ""
      ) +
      '){"use strict";' +
      code +
      "\n}))"

    if (options.sourceMap) {
      content += createInlineSourceMap(compileData.filename, content)
    }

    return content
  }

  return compileSource
}

export default shared.inited
  ? shared.module.moduleInternalCompileSource
  : shared.module.moduleInternalCompileSource = init()
