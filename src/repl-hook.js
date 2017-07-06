import compiler from "./caching-compiler.js"
import path from "path"
import Runtime from "./runtime.js"
import utils from "./utils.js"
import vm from "vm"
import Wrapper from "./wrapper.js"

const pkgMain = __non_webpack_module__.filename
let rootModule = __non_webpack_module__

while (rootModule.parent != null) {
  rootModule = rootModule.parent
}

if (rootModule.filename === null &&
    rootModule.id === "<repl>" &&
    rootModule.loaded === false &&
    rootModule.parent === void 0 &&
    rootModule.children.some((child) => child.filename === pkgMain)) {
  // Enable ESM in the default Node REPL by loading @std/esm upon entering.
  // Custom REPLs can still define their own eval functions to bypass this,
  // but that's a feature, not a drawback.
  const md5Hash = utils.md5(Date.now()).substr(0, 4)
  const runtimeAlias = utils.encodeIdent("_" + md5Hash)

  Wrapper.manage(vm, "createScript", function (func, code, options) {
    const pkgInfo = utils.getPkgInfo()
    const wrapped = Wrapper.find(vm, "createScript", pkgInfo.range)
    return wrapped.call(this, func, pkgInfo, code, options)
  })

  Wrapper.wrap(vm, "createScript", function (func, pkgInfo, code, options) {
    options = Object.assign(Object.create(null), options)

    const cache = pkgInfo.cache
    const cacheFileName = utils.getCacheFileName(null, code, pkgInfo)
    const cacheValue = cache.get(cacheFileName)
    const lineOffset = (+options.lineOffset || 0) - 1

    let output

    if (options.produceCachedData === void 0) {
      options.produceCachedData = true
    }

    if (utils.isObject(cacheValue)) {
      output = cacheValue.code
      if (options.produceCachedData === true &&
          options.cachedData === void 0 &&
          cacheValue.data !== void 0) {
        options.cachedData = cacheValue.data
      }
    } else {
      output = compiler.compile(code, {
        cacheFileName,
        pkgInfo,
        runtimeAlias
      }).code
    }

    output =
      '"use strict";var ' + runtimeAlias + "=" + runtimeAlias +
      "||[module.exports,module.exports={}][0];\n" + output

    let result

    try {
      result = func.call(this, output, options)
    } catch (e) {
      const runtimeIndex = e.stack.indexOf(runtimeAlias)

      if (runtimeIndex < 0) {
        throw e
      }

      // Mask runtime calls in the error.stack.
      const stackLines = e.stack.split("\n")
      const stackLine = stackLines[1]
      const carrotIndex = stackLines[2].indexOf("^")
      const lineIndex = /repl:(\d+)/.exec(stackLines[0])[1] - 1
      const line = code.split("\n")[lineIndex + lineOffset]

      stackLines[1] = line

      if (carrotIndex > runtimeIndex) {
        // Move the carrot to the left.
        const snippet = stackLine.substr(carrotIndex, 2)
        const matchIndex = line.indexOf(snippet, runtimeIndex)

        if (matchIndex > -1) {
          stackLines[2] = " ".repeat(matchIndex) + "^"
        } else {
          stackLines.splice(2, 1)
        }
      }

      e.stack = stackLines.join("\n")
      throw e
    }

    if (result.cachedDataProduced) {
      cache.get(cacheFileName).data = result.cachedData
    }

    return result
  })

  Runtime.enable(rootModule)
}
