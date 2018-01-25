import { inspect, promisify } from "util"

import FastObject from "./fast-object.js"

import getModuleURL from "./util/get-module-url.js"
import setProperty from "./util/set-property.js"
import toStringLiteral from "./util/to-string-literal.js"

let codeSym

try {
  promisify()
} catch (e) {
  const symbols = Object.getOwnPropertySymbols(e)
  codeSym = symbols.length ? symbols[0] : Symbol.for("@std/esm:errorCode")
}

const messages = new FastObject

messages.ERR_EXPORT_MISSING = exportMissing
messages.ERR_EXPORT_STAR_CONFLICT = exportStarConflict
messages.ERR_INVALID_ARG_TYPE = invalidArgType
messages.ERR_INVALID_ARG_VALUE = invalidArgValue
messages.ERR_INVALID_PROTOCOL = invalidProtocol
messages.ERR_MISSING_MODULE = missingESM
messages.ERR_MODULE_RESOLUTION_LEGACY = moduleResolutionLegacy
messages.ERR_REQUIRE_ESM = requireESM
messages.ERR_UNKNOWN_FILE_EXTENSION = unknownFileExtension
messages.MODULE_NOT_FOUND = missingCJS

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
        setProperty(this, codeSym, { enumerable: false, value: code })
      }
    }

    get code() {
      return this[codeSym]
    }

    set code(value) {
      setProperty(this, "code", { value })
    }

    get name() {
      return super.name + " [" + this[codeSym] + "]"
    }

    set name(value) {
      setProperty(this, "name", { value })
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

function missingESM(request) {
  return "Cannot find module " + getModuleURL(request)
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

const errors = new FastObject

errors.Error = createNodeClass(Error)
errors.SyntaxError = createBuiltinClass(SyntaxError)
errors.TypeError = createNodeClass(TypeError)

export default errors
