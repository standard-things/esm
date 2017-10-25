import { format, promisify } from "util"

import FastObject from "./fast-object.js"

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
messages["ERR_MISSING_MODULE"] = "Cannot find module %s"
messages["ERR_MODULE_RESOLUTION_LEGACY"] = "%s not found by import in %s. Legacy behavior in require() would have found it at %s"
messages["ERR_REQUIRE_ESM"] = "Must use import to load ES Module: %s"

function createClass(Super) {
  return class NodeError extends Super {
    constructor(key, ...args) {
      super(getMessage(key, args))
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

function getMessage(key, args) {
  const message = messages[key]

  if (typeof message == "function") {
    return message(...args)
  }

  args.unshift(message)
  return format(...args)
}

function invalidArgType(name, expected) {
  return "The " + toStringLiteral(name, "'") + " argument must be " + expected
}

function invalidProtocol(protocol, expected) {
  return "Protocol " + toStringLiteral(protocol, "'") +
    " not supported. Expected " + toStringLiteral(expected, "'")
}

export default errors
