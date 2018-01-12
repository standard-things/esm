import FastObject from "./fast-object.js"

import getModuleName from "./util/get-module-name.js"
import { promisify } from "util"
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
messages["ERR_EXPORT_MISSING"] = exportMissing
messages["ERR_EXPORT_STAR_CONFLICT"] = exportStarConflict
messages["ERR_INVALID_ARG_TYPE"] = invalidArgType
messages["ERR_INVALID_PROTOCOL"] = invalidProtocol
messages["ERR_MISSING_MODULE"] = missingModule
messages["ERR_MODULE_RESOLUTION_LEGACY"] = moduleResolutionLegacy
messages["ERR_REQUIRE_ESM"] = requireESM
messages["ERR_UNKNOWN_FILE_EXTENSION"] = unknownFileExtension

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
      setProperty(this, codeSym, { enumerable: false, value: code })
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
  const moduleName = getModuleName(request)
  return "Module " + toStringLiteral(moduleName, "'") +
    " does not provide an export named '" + exportName + "'"
}

function exportStarConflict(request, exportName) {
  const moduleName = getModuleName(request)
  return "Module " + toStringLiteral(moduleName, "'") +
    " contains conflicting star exports for name '" + exportName + "'"
}

function invalidArgType(argName, expected) {
  return "The '" + argName + "' argument must be " + expected
}

function invalidProtocol(protocol, expected) {
  return "Protocol '" + protocol +
    "' not supported. Expected '" + expected + "'"
}

function missingModule(request) {
  return "Cannot find module " + getModuleName(request)
}

function moduleResolutionLegacy(id, fromPath, foundPath) {
  return id + " not found by import in " + fromPath +
    ". Legacy behavior in require() would have found it at " + foundPath
}

function requireESM(request) {
  return "Must use import to load ES Module: " + getModuleName(request)
}

function unknownFileExtension(filePath) {
  return "Unknown file extension: " + filePath
}

const errors = new FastObject
const supers = [Error, TypeError]

errors.SyntaxError = createBuiltinClass(SyntaxError)
supers.forEach((Super) => errors[Super.name] = createNodeClass(Super))

export default errors
