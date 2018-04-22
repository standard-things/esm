import getModuleURL from "./util/get-module-url.js"
import { inspect } from "./safe/util.js"
import shared from "./shared.js"
import toStringLiteral from "./util/to-string-literal.js"
import { version } from "./version.js"

function init() {
  const ExError = __external__.Error
  const ExReferenceError = __external__.ReferenceError
  const ExSyntaxError = __external__.SyntaxError
  const ExTypeError = __external__.TypeError

  const errors = { __proto__: null }
  const messages = { __proto__: null }

  const truncInspectOptions = {
    __proto__: null,
    depth: 2
  }

  addBuiltinError("ERR_EXPORT_MISSING", exportMissing, ExSyntaxError)
  addBuiltinError("ERR_EXPORT_STAR_CONFLICT", exportStarConflict, ExSyntaxError)
  addBuiltinError("ERR_INVALID_ESM_FILE_EXTENSION", invalidExtension, ExError)
  addBuiltinError("ERR_INVALID_ESM_MODE", invalidPkgMode, ExError)
  addBuiltinError("ERR_UNDEFINED_IDENTIFIER", undefinedIdentifier, ExReferenceError)
  addBuiltinError("ERR_UNKNOWN_ESM_OPTION", unknownPkgOption, ExError)

  addLegacyError("MODULE_NOT_FOUND", missingCJS, ExError)

  addNodeError("ERR_INVALID_ARG_TYPE", invalidArgType, ExTypeError)
  addNodeError("ERR_INVALID_ARG_VALUE", invalidArgValue, ExError)
  addNodeError("ERR_INVALID_PROTOCOL", invalidProtocol, ExError)
  addNodeError("ERR_MODULE_RESOLUTION_LEGACY", moduleResolutionLegacy, ExError)
  addNodeError("ERR_REQUIRE_ESM", requireESM, ExError)
  addNodeError("ERR_UNKNOWN_FILE_EXTENSION", unknownFileExtension, ExError)

  function addBuiltinError(code, messageHandler, Super) {
    errors[code] = createBuiltinErrorClass(Super, code)
    messages[code] = messageHandler
  }

  function addLegacyError(code, messageHandler, Super) {
    errors[code] = createLegacyErrorClass(Super, code)
    messages[code] = messageHandler
  }

  function addNodeError(code, messageHandler, Super) {
    errors[code] = createNodeErrorClass(Super, code)
    messages[code] = messageHandler
  }

  function createBuiltinErrorClass(Super, code) {
    return function BuiltinError(...args) {
      return new Super(messages[code](...args))
    }
  }

  function createLegacyErrorClass(Super, code) {
    return class LegacyError extends Super {
      constructor(...args) {
        super(messages[code](...args))
        this.code = code
      }
    }
  }

  function createNodeErrorClass(Super, code) {
    return class NodeError extends Super {
      constructor(...args) {
        super(messages[code](...args))

        if (code === "MODULE_NOT_FOUND") {
          this.code = code
          this.name = super.name
        }
      }

      get code() {
        return code
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
        return super.name + " [" + code + "]"
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

  function truncInspect(value) {
    const inspected = inspect(value, truncInspectOptions)

    return inspected.length > 128
      ? inspected.slice(0, 128) + "..."
      : inspected
  }

  function exportMissing(request, exportName) {
    return "Missing export '" + exportName +
      "' in ES module: " + getModuleURL(request)
  }

  function exportStarConflict(request, exportName) {
    return "Conflicting star export '" + exportName +
      "' in ES module: " + getModuleURL(request)
  }

  function invalidArgType(argName, expected, actual) {
    let message = "The '" + argName + "' argument must be " + expected

    if (arguments.length > 2) {
      message += ". Received type " + (actual === null ? "null" : typeof actual)
    }

    return message
  }

  function invalidArgValue(argName, value, reason = "is invalid") {
    return "The argument '" + argName + "' " + reason +
      ". Received " + truncInspect(value)
  }

  function invalidExtension(request) {
    return "Cannot load ES module from .mjs: " + getModuleURL(request)
  }

  function invalidPkgMode(mode) {
    return "The esm@" + version +
      " option 'mode' is invalid. Received " + truncInspect(mode)
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
    // Keep "Module" capitalized to align with Node.
    return "Must use import to load ES Module: " + getModuleURL(request)
  }

  function unknownFileExtension(filename) {
    return "Unknown file extension: " + filename
  }

  function unknownPkgOption(optionName) {
    return "Unknown esm@" + version + " option: " + optionName
  }

  function undefinedIdentifier(identName) {
    return identName + " is not defined"
  }

  return errors
}

export default shared.inited
  ? shared.module.errors
  : shared.module.errors = init()
