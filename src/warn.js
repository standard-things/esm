import ESM from "./constant/esm.js"

import emitWarning from "./util/emit-warning.js"
import getModuleURL from "./util/get-module-url.js"
import shared from "./shared.js"

function init() {
  const {
    PKG_VERSION
  } = ESM

  const messages = { __proto__: null }
  const warned = { __proto__: null }

  addWarning("WRN_ARGUMENTS_ACCESS", argumentsAccess)

  function addWarning(code, messageHandler) {
    messages[code] = messageHandler
  }

  function argumentsAccess(request, line, column) {
    return "esm@" + PKG_VERSION +
      " detected undefined arguments access (" +
      line + ":" + column + "): " + getModuleURL(request)
  }

  function warn(code, ...args) {
    const cacheKey = code + "\0" + args.join("\0")

    if (! Reflect.has(warned, cacheKey)) {
      warned[cacheKey] = true
      emitWarning(messages[code](...args))
    }
  }

  return warn
}

export default shared.inited
  ? shared.module.warn
  : shared.module.warn = init()
