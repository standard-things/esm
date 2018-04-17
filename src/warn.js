import emitWarning from "./util/emit-warning.js"
import getModuleURL from "./util/get-module-url.js"
import { name as pkgName } from "./version.js"
import shared from "./shared.js"
import toStringLiteral from "./util/to-string-literal.js"

function init() {
  const cacheKeys = { __proto__: null }
  const messages = { __proto__: null }
  const warned = { __proto__: null }

  addWarning("WRN_ARGUMENTS_ACCESS", argumentsAccess)
  addWarning("WRN_NS_ASSIGNMENT", namespaceAssignment, moduleCacheKey)
  addWarning("WRN_NS_EXTENSION", namespaceExtension, moduleCacheKey)

  function addWarning(code, messageHandler, cacheKeyHandler) {
    if (cacheKeyHandler) {
      cacheKeys[code] = cacheKeyHandler
    }

    messages[code] = messageHandler
  }

  function getCacheKey(code, args) {
    const serialized = Reflect.has(cacheKeys, code)
      ? cacheKeys[code](...args)
      : args.join("\0")

    return code + "\0" + serialized
  }

  function moduleCacheKey(request, name) {
    return getModuleURL(request) + "\0" + name
  }

  function argumentsAccess(request, line, column) {
    return pkgName + " detected undefined arguments access (" +
      line + ":" + column + "): " + getModuleURL(request)
  }

  function namespaceAssignment(request, name) {
    return pkgName + " cannot assign to the read only module namespace property " +
      toStringLiteral(name, "'") + " of " + getModuleURL(request)
  }

  function namespaceExtension(request, name) {
    return pkgName + " cannot add property " + toStringLiteral(name, "'") +
      " to module namespace of " + getModuleURL(request)
  }

  function warn(code, ...args) {
    const cacheKey = getCacheKey(code, args)

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
