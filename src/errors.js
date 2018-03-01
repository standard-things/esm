import getModuleURL from "./util/get-module-url.js"
import { inspect } from "util"
import shared from "./shared.js"
import toStringLiteral from "./util/to-string-literal.js"

const messages = {
  __proto__: null,
  ERR_EXPORT_MISSING: exportMissing,
  ERR_EXPORT_STAR_CONFLICT: exportStarConflict,
  ERR_INVALID_ARG_TYPE: invalidArgType,
  ERR_INVALID_ARG_VALUE: invalidArgValue,
  ERR_INVALID_PROTOCOL: invalidProtocol,
  ERR_MODULE_RESOLUTION_LEGACY: moduleResolutionLegacy,
  ERR_REQUIRE_ESM: requireESM,
  ERR_UNKNOWN_FILE_EXTENSION: unknownFileExtension,
  MODULE_NOT_FOUND: missingCJS
}

function createBuiltinClass(Super) {
  return class BuiltinError extends Super {
    constructor(code, ...args) {
      super(messages[code](...args))
    }
  }
}

function createNodeClass(Super) {
  return class NodeError extends Super {
    constructor(code, ...args) {
      super(messages[code](...args))

      if (code === "MODULE_NOT_FOUND") {
        this.code = code
        this.name = super.name
      } else {
        Reflect.defineProperty(this, shared.symbol.errorCode, {
          __proto__: null,
          configurable: true,
          value: code,
          writable: true
        })
      }
    }

    get code() {
      return this[shared.symbol.errorCode]
    }

    set code(value) {
      Reflect.defineProperty(this, "code", {
        __proto__: null,
        configurable: true,
        enumerable: true,
        value,
        writable: true
      })
    }

    get name() {
      return super.name + " [" + this[shared.symbol.errorCode] + "]"
    }

    set name(value) {
      Reflect.defineProperty(this, "name", {
        __proto__: null,
        configurable: true,
        enumerable: true,
        value,
        writable: true
      })
    }
  }
}

function exportMissing(request, exportName) {
  const moduleName = getModuleURL(request)

  return "Module " + toStringLiteral(moduleName, "'") +
    " does not provide an export named '" + exportName + "'"
}

function exportStarConflict(request, exportName) {
  const moduleName = getModuleURL(request)

  return "Module " + toStringLiteral(moduleName, "'") +
    " contains conflicting star exports for name '" + exportName + "'"
}

function invalidArgType(argName, expected, actual) {
  const message = "The '" + argName + "' argument must be " + expected

  return arguments.length > 2
    ? message + ". Received type " + (actual === null ? "null" : typeof actual)
    : message
}

function invalidArgValue(argName, value, reason = "is invalid") {
  let inspected = inspect(value)

  if (inspected.length > 128) {
    inspected = inspected.slice(0, 128) + "..."
  }

  return "The argument '" + argName + "' " + reason + ". Received " + inspected
}

function invalidProtocol(protocol, expected) {
  return "Protocol '" + protocol +
    "' not supported. Expected '" + expected + "'"
}

function missingCJS(request) {
  return "Cannot find module " + toStringLiteral(request, "'")
}

function moduleResolutionLegacy(id, fromPath, foundPath) {
  return id + " not found by import in " + fromPath +
    ". Legacy behavior in require() would have found it at " + foundPath
}

function requireESM(request) {
  return "Must use import to load ES Module: " + getModuleURL(request)
}

function unknownFileExtension(filename) {
  return "Unknown file extension: " + filename
}

const errors = {
  __proto__: null,
  Error: createNodeClass(__external__.Error),
  SyntaxError: createBuiltinClass(__external__.SyntaxError),
  TypeError: createNodeClass(__external__.TypeError)
}

export default errors
