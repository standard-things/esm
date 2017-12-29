import FastObject from "./fast-object.js"

import emitWarning from "./warning/emit-warning.js"
import getModuleName from "./util/get-module-name.js"
import toStringLiteral from "./util/to-string-literal.js"

const cacheKeys = new FastObject
cacheKeys["WRN_NS_ASSIGNMENT"] =
cacheKeys["WRN_NS_EXTENSION"] =
cacheKeys["WRN_TDZ_ACCESS"] = moduleCacheKey

const messages = new FastObject
messages["WRN_ARGUMENTS_ACCESS"] = argumentsAccess
messages["WRN_NS_ASSIGNMENT"] = namespaceAssignment
messages["WRN_NS_EXTENSION"] = namespaceExtension
messages["WRN_TDZ_ACCESS"] = temporalDeadZoneAccess

const warned = new FastObject

function defaultCacheKey(code, args) {
  return code + "\0" + args.join("\0")
}

function moduleCacheKey(code, [request, name]) {
  return code + "\0" + getModuleName(request) + "\0" + name
}

function getCacheKey(code, args) {
  const getter = cacheKeys[code] || defaultCacheKey
  return getter(code, args)
}

function argumentsAccess(request, line, column) {
  return "@std/esm detected undefined arguments access (" +
    line + ":" + column + "): " + getModuleName(request)
}

function namespaceAssignment(request, key) {
  return "@std/esm cannot assign to the read only module namespace property " +
    toStringLiteral(key, "'") + " of " + getModuleName(request)
}

function namespaceExtension(request, key) {
  return "@std/esm cannot add property " + toStringLiteral(key, "'") +
    " to module namespace of " + getModuleName(request)
}

function temporalDeadZoneAccess(request, varName) {
  return "@std/esm detected possible temporal dead zone access of " +
    toStringLiteral(varName, "'") + " in " + getModuleName(request)
}

function warn(code, ...args) {
  const cacheKey = getCacheKey(code, args)

  if (! (cacheKey in warned)) {
    warned[cacheKey] = true
    emitWarning(messages[code](...args))
  }
}

export default warn
