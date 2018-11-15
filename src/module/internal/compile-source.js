import CHAR_CODE from "../../constant/char-code.js"
import SOURCE_TYPE from "../../constant/source-type.js"

import createSourceMap from "../../util/create-source-map.js"
import encodeURI from "../../util/encode-uri.js"
import shared from "../../shared.js"
import stripShebang from "../../util/strip-shebang.js"

function init() {
  const {
    SEMICOLON
  } = CHAR_CODE

  const {
    MODULE
  } = SOURCE_TYPE

  function compileSource(compileData, options = {}) {
    const compile = compileData.sourceType === MODULE
      ? compileESM
      : compileCJS

    return compile(compileData, options)
  }

  function compileCJS(compileData, options) {
    let content = compileData.code

    if (compileData.changed) {
      const { runtimeName } = options

      const returnRun = options.return === void 0
        ? true
        : options.return

      content =
        "const " + runtimeName + "=exports;" +
        (returnRun ? "return " : "") +
        runtimeName + ".r((" +
        (options.async ? "async " :  "") +
        "function(exports,require){" +
        content +
        "\n}))"
    } else if (options.async) {
      content =
        "(async () => { " +
        stripShebang(content) +
        "\n})();"
    }

    if (options.sourceMap) {
      content += createInlineSourceMap(content, compileData.filename)
    }

    return content
  }

  function compileESM(compileData, options) {
    let { code } = compileData

    if (! compileData.changed) {
      code = stripShebang(code)
    }

    const {
      async,
      cjsVars,
      runtimeName
    } = options

    const returnRun = options.return === void 0
      ? true
      : options.return

    const { yieldIndex } = compileData

    if (! async &&
        yieldIndex !== -1) {
      if (yieldIndex === 0) {
        code = "yield;" + code
      } else {
        code =
          code.slice(0, yieldIndex) +
          (code.charCodeAt(yieldIndex - 1) === SEMICOLON ? "" : ";") +
          "yield;" +
          code.slice(yieldIndex)
      }
    }

    let content =
      "const " + runtimeName + "=exports;" +
      (cjsVars
        ? ""
        : "__dirname=__filename=arguments=exports=module=require=void 0;"
      ) +
      (returnRun ? "return " : "") +
      runtimeName + ".r((" +
      (async ? "async " :  "") +
      "function" +
      (async ? "" : " *") +
      "(" +
      (cjsVars
        ? "exports,require"
        : ""
      ) +
      '){"use strict";' +
      code +
      "\n}))"

    if (options.sourceMap) {
      content += createInlineSourceMap(content, compileData.filename)
    }

    return content
  }

  function createInlineSourceMap(content, filename) {
    return "//# sourceMappingURL=data:application/json;charset=utf-8," +
      encodeURI(createSourceMap(filename, content))
  }

  return compileSource
}

export default shared.inited
  ? shared.module.moduleInternalCompileSource
  : shared.module.moduleInternalCompileSource = init()
