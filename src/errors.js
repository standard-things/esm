import FastObject from "./fast-object.js"

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

const errors = new FastObject
const supers = [Error, TypeError]
supers.forEach((Super) => errors[Super.name] = createClass(Super))

const messages = new FastObject
messages["ERR_INVALID_ARG_TYPE"] = invalidArgType
messages["ERR_INVALID_PROTOCOL"] = invalidProtocol
messages["ERR_MISSING_MODULE"] = missingModule
messages["ERR_MODULE_RESOLUTION_LEGACY"] = moduleResolutionLegacy
messages["ERR_REQUIRE_ESM"] = requireESM

function createClass(Super) {
  return class NodeError extends Super {
    constructor(key, ...args) {
      super(messages[key](...args))
      setProperty(this, codeSym, { enumerable: false, value: key })
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

function invalidArgType(name, expected) {
  return "The " + toStringLiteral(name, "'") + " argument must be " + expected
}

function invalidProtocol(protocol, expected) {
  return "Protocol " + toStringLiteral(protocol, "'") +
    " not supported. Expected " + toStringLiteral(expected, "'")
}

function missingModule(moduleName) {
  return "Cannot find module " + moduleName
}

function moduleResolutionLegacy(id, fromPath, foundPath) {
  return id + " not found by import in " + fromPath +
    ". Legacy behavior in require() would have found it at " + foundPath
}

function requireESM(moduleName) {
  return "Must use import to load ES Module: " + moduleName
}

export default errors
