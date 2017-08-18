import FastObject from "./fast-object.js"

import { format } from "util"
import toStringLiteral from "./util/to-string-literal.js"

const codeSym = Symbol.for("@std/esm:errorCode")
const messageMap = new Map
const supers = [Error, TypeError]

const errors = new FastObject
supers.forEach((sup) => errors[sup.name] = createClass(sup))

messageMap.set("ERR_INVALID_ARG_TYPE", invalidArgType)
messageMap.set("ERR_INVALID_PROTOCOL", invalidProtocol)
messageMap.set("ERR_MISSING_MODULE", "Cannot find module %s")
messageMap.set("ERR_MODULE_RESOLUTION_DEPRECATED", "%s not found by import in %s. Deprecated behavior in require would have found it at %s")
messageMap.set("ERR_REQUIRE_ESM", "Must use import to load ES Module: %s")

function createClass(Super) {
  class NodeError extends Super {
    constructor(key, ...args) {
      super(getMessage(key, args))
      this[codeSym] = key
    }

    get name() {
      return super.name + " [" + this[codeSym] + "]"
    }

    get code() {
      return this[codeSym]
    }
  }

  Object.setPrototypeOf(NodeError.prototype, null)
  return NodeError
}

function getMessage(key, args) {
  const message = messageMap.get(key)

  if (typeof message == "function") {
    return message(...args)
  }

  args.unshift(message)
  return String(format(...args))
}

function invalidArgType(name, expected) {
  return "The " + quote(name) + " argument must be " + expected
}

function invalidProtocol(protocol, expectedProtocol) {
  return "Protocol " + quote(protocol) +
    " not supported. Expected " + quote(expectedProtocol)
}

function quote(value) {
  return toStringLiteral(value, "'")
}

export default errors

