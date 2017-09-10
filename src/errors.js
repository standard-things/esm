import FastObject from "./fast-object.js"

import { format } from "util"
import toStringLiteral from "./util/to-string-literal.js"

const codeSym = Symbol.for("@std/esm:errorCode")
const supers = [Error, TypeError]

const errors = new FastObject
supers.forEach((Super) => errors[Super.name] = createClass(Super))

const messages = new FastObject
messages["ERR_INVALID_ARG_TYPE"] = invalidArgType
messages["ERR_INVALID_PROTOCOL"] = invalidProtocol
messages["ERR_MISSING_MODULE"] = "Cannot find module %s"
messages["ERR_MODULE_RESOLUTION_LEGACY"] = "%s not found by import in %s. Legacy behavior in require would have found it at %s"
messages["ERR_REQUIRE_ESM"] = "Must use import to load ES Module: %s"

function createClass(Super) {
  class NodeError extends Super {
    constructor(key, ...args) {
      super(getMessage(key, args))
      this[codeSym] = key
    }

    get name() {
      return Super.name + " [" + this[codeSym] + "]"
    }

    get code() {
      return this[codeSym]
    }
  }

  Object.setPrototypeOf(NodeError.prototype, null)
  return NodeError
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
  return "The " + toStringLiteral(name) + " argument must be " + expected
}

function invalidProtocol(protocol, expected) {
  return "Protocol " + toStringLiteral(protocol) +
    " not supported. Expected " + toStringLiteral(expected)
}

export default errors
