import CHAR_CODE from "./constant/char-code.js"
import ESM from "./constant/esm.js"

import captureStackTrace from "./error/capture-stack-trace.js"
import constructError from "./error/construct-error.js"
import get from "./util/get.js"
import getLocationFromStackTrace from "./error/get-location-from-stack-trace.js"
import getModuleName from "./util/get-module-name.js"
import getModuleURL from "./util/get-module-url.js"
import inspectTrunc from "./util/inspect-trunc.js"
import setProperty from "./util/set-property.js"
import shared from "./shared.js"
import toString from "./util/to-string.js"
import toStringLiteral from "./util/to-string-literal.js"

function init() {
  const {
    APOSTROPHE
  } = CHAR_CODE

  const {
    PACKAGE_VERSION
  } = ESM

  const {
    Error: ExError,
    ReferenceError: ExReferenceError,
    SyntaxError: ExSyntaxError,
    TypeError: ExTypeError
  } = shared.external

  const templateMap = new Map

  const errors = {
    MAIN_NOT_FOUND: function (request, jsonPath) {
      const error = new ExError(
        "Cannot find module " + toStringLiteral(request, APOSTROPHE) +
        '. Please verify that the package.json has a valid "main" entry'
      )

      error.code = "MODULE_NOT_FOUND"
      error.path = jsonPath
      error.requestPath = request

      return error
    },
    MODULE_NOT_FOUND: function (request, parent) {
      const requireStack = getStructuredRequireStack(parent)

      let message = "Cannot find module " + toStringLiteral(request, APOSTROPHE)

      if (requireStack.length !== 0) {
        message +=
          "\nRequire stack:\n- " +
          requireStack.join("\n- ")
      }

      const error = new ExError(message)

      error.code = "MODULE_NOT_FOUND"
      error.requireStack = requireStack

      return error
    }
  }

  addBuiltinError("ERR_CONST_ASSIGNMENT", constAssignment, ExTypeError)
  addBuiltinError("ERR_EXPORT_CYCLE", exportCycle, ExSyntaxError)
  addBuiltinError("ERR_EXPORT_MISSING", exportMissing, ExSyntaxError)
  addBuiltinError("ERR_EXPORT_STAR_CONFLICT", exportStarConflict, ExSyntaxError)
  addBuiltinError("ERR_INVALID_ESM_OPTION", invalidPkgOption, ExError)
  addBuiltinError("ERR_NS_ASSIGNMENT", namespaceAssignment, ExTypeError)
  addBuiltinError("ERR_NS_DEFINITION", namespaceDefinition, ExTypeError)
  addBuiltinError("ERR_NS_DELETION", namespaceDeletion, ExTypeError)
  addBuiltinError("ERR_NS_EXTENSION", namespaceExtension, ExTypeError)
  addBuiltinError("ERR_NS_REDEFINITION", namespaceRedefinition, ExTypeError)
  addBuiltinError("ERR_UNDEFINED_IDENTIFIER", undefinedIdentifier, ExReferenceError)
  addBuiltinError("ERR_UNKNOWN_ESM_OPTION", unknownPkgOption, ExError)

  addNodeError("ERR_INVALID_ARG_TYPE", invalidArgType, ExTypeError)
  addNodeError("ERR_INVALID_ARG_VALUE", invalidArgValue, ExError)
  addNodeError("ERR_INVALID_PROTOCOL", invalidProtocol, ExError)
  addNodeError("ERR_MODULE_RESOLUTION_LEGACY", moduleResolutionLegacy, ExError)
  addNodeError("ERR_REQUIRE_ESM", requireESM, ExError)
  addNodeError("ERR_UNKNOWN_FILE_EXTENSION", unknownFileExtension, ExError)

  function addBuiltinError(code, template, Super) {
    errors[code] = createBuiltinErrorClass(Super, code)
    templateMap.set(code, template)
  }

  function addNodeError(code, template, Super) {
    errors[code] = createNodeErrorClass(Super, code)
    templateMap.set(code, template)
  }

  function createBuiltinErrorClass(Super, code) {
    return function BuiltinError(...args) {
      const { length } = args

      const last = length === 0
        ? null
        : args[length - 1]

      const beforeFunc = typeof last === "function"
        ? args.pop()
        : null

      const template = templateMap.get(code)
      const message = template(...args)

      let error

      if (beforeFunc === null) {
        error = constructError(Super, [message])
      } else {
        error = constructError(Super, [message], 0)
        captureStackTrace(error, beforeFunc)
      }

      const loc = getLocationFromStackTrace(error)

      if (loc !== null) {
        const stack = get(error, "stack")

        if (typeof stack === "string") {
          Reflect.defineProperty(error, "stack", {
            configurable: true,
            value:
              loc.filename + ":" +
              loc.line + "\n" +
              stack,
            writable: true
          })
        }
      }

      return error
    }
  }

  function createNodeErrorClass(Super, code) {
    return class NodeError extends Super {
      constructor(...args) {
        const template = templateMap.get(code)

        super(template(...args))

        const name = toString(get(this, "name"))

        // Add the error code to the name to include it in the stack trace.
        Reflect.defineProperty(this, "name", {
          configurable: true,
          value: name + " [" + code + "]",
          writable: true
        })

        // Access the stack to generate the error message including the error
        // code from the name.
        get(this, "stack")
        // Reset the name to the actual name.
        Reflect.deleteProperty(this, "name")
      }

      get code() {
        return code
      }

      set code(value) {
        setProperty(this, "code", value)
      }
    }
  }

  function getStructuredRequireStack(parent) {
    const stack = []
    const seen = new Set

    while (parent != null &&
           ! seen.has(parent)) {
      seen.add(parent)
      stack.push(getModuleName(parent))
      parent = parent.parent
    }

    return stack
  }

  function stringifyName(name) {
    return typeof name === "symbol"
      ? toString(name)
      : toStringLiteral(name, APOSTROPHE)
  }

  function constAssignment() {
    return "Assignment to constant variable."
  }

  function exportCycle(request, name) {
    return "Detected cycle while resolving name '" + name +
           "' in '" + getModuleURL(request) + "'"
  }

  function exportMissing(request, name) {
    return "The requested module '" + getModuleURL(request) +
           "' does not provide an export named '" + name + "'"
  }

  function exportStarConflict(request, name) {
    return "The requested module '" + getModuleURL(request) +
           "' contains conflicting star exports for name '" + name + "'"
  }

  function invalidArgType(name, expected, actual) {
    let message = "The '" + name + "' argument must be " + expected

    if (arguments.length > 2) {
      message +=
        ". Received type " +
        (actual === null
          ? "null"
          : typeof actual
        )
    }

    return message
  }

  function invalidArgValue(name, value, reason = "is invalid") {
    return "The argument '" + name + "' " + reason +
           ". Received " + inspectTrunc(value)
  }

  function invalidPkgOption(name, value, unquoted) {
    return "The esm@" + PACKAGE_VERSION + " option " +
           (unquoted
             ? toString(name)
             : toStringLiteral(name, APOSTROPHE)
           ) +
           " is invalid. Received " + inspectTrunc(value)
  }

  function invalidProtocol(protocol, expected) {
    return "Protocol '" + protocol +
           "' not supported. Expected '" + expected + "'"
  }

  function moduleResolutionLegacy(id, fromPath, foundPath) {
    return id + " not found by import in " + fromPath +
           ". Legacy behavior in require() would have found it at " + foundPath
  }

  function namespaceAssignment(request, name) {
    return "Cannot assign to read only module namespace property " +
           stringifyName(name) + " of " + getModuleURL(request)
  }

  function namespaceDefinition(request, name) {
    return "Cannot define module namespace property " +
           stringifyName(name) + " of " + getModuleURL(request)
  }

  function namespaceDeletion(request, name) {
    return "Cannot delete module namespace property " +
           stringifyName(name) + " of " + getModuleURL(request)
  }

  function namespaceExtension(request, name) {
    return "Cannot add module namespace property " +
           stringifyName(name) + " to " + getModuleURL(request)
  }

  function namespaceRedefinition(request, name) {
    return "Cannot redefine module namespace property " +
           stringifyName(name) + " of " + getModuleURL(request)
  }

  function requireESM(request) {
    return "Must use import to load module: " + getModuleURL(request)
  }

  function undefinedIdentifier(name) {
    return name + " is not defined"
  }

  function unknownFileExtension(filename) {
    return "Unknown file extension: " + filename
  }

  function unknownPkgOption(name) {
    return "Unknown esm@" + PACKAGE_VERSION + " option: " + name
  }

  return errors
}

export default shared.inited
  ? shared.module.errors
  : shared.module.errors = init()
