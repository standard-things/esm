import emitWarning from "./warning/emit-warning.js"
import getModuleURL from "./util/get-module-url.js"
import { name as stdName } from "./version.js"
import toStringLiteral from "./util/to-string-literal.js"

const cacheKeys = { __proto__: null }
const messages = { __proto__: null }
const warned = { __proto__: null }

addWarning("WRN_ARGUMENTS_ACCESS", argumentsAccess)
addWarning("WRN_NS_ASSIGNMENT", namespaceAssignment, moduleCacheKey)
addWarning("WRN_NS_EXTENSION", namespaceExtension, moduleCacheKey)
addWarning("WRN_TDZ_ACCESS", temporalDeadZoneAccess, moduleCacheKey)

function addWarning(code, messageHandler, cacheKeyHandler) {
  if (cacheKeyHandler) {
    cacheKeys[code] = cacheKeyHandler
  }

  messages[code] = messageHandler
}

function getCacheKey(code, args) {
  const key = code in cacheKeys
    ? cacheKeys[code](...args)
    : args.join("\0")

  return code + "\0" + key
}

function moduleCacheKey(request, name) {
  return getModuleURL(request) + "\0" + name
}

function argumentsAccess(request, line, column) {
  return stdName + " detected undefined arguments access (" +
    line + ":" + column + "): " + getModuleURL(request)
}

function namespaceAssignment(request, key) {
  return stdName + " cannot assign to the read only module namespace property " +
    toStringLiteral(key, "'") + " of " + getModuleURL(request)
}

function namespaceExtension(request, key) {
  return stdName + " cannot add property " + toStringLiteral(key, "'") +
    " to module namespace of " + getModuleURL(request)
}

function temporalDeadZoneAccess(request, varName) {
  return stdName + " detected possible temporal dead zone access of '" +
    varName + "' in " + getModuleURL(request)
}

function warn(code, ...args) {
  const cacheKey = getCacheKey(code, args)

  if (! (cacheKey in warned)) {
    warned[cacheKey] = true
    emitWarning(messages[code](...args))
  }
}

export default warn
