import { format } from "util"
import toStringLiteral from "./util/to-string-literal.js"

const codeSym = Symbol.for("@std/esm:errorCode")
const messageMap = new Map

messageMap.set("ERR_INVALID_PROTOCOL", invalidProtocol)
messageMap.set("ERR_MISSING_MODULE", "Cannot find module %s")
messageMap.set("ERR_MODULE_RESOLUTION_DEPRECATED", "%s not found by import in %s. Deprecated behavior in require would have found it at %s")
messageMap.set("ERR_REQUIRE_ESM", "Must use import to load ES Module: %s")

class NodeError extends Error {
  constructor(key, ...args) {
    super(getMessage(key, args))
    this[codeSym] = key
  }

  get name() {
    return "Error [" + this[codeSym] + "]"
  }

  get code() {
    return this[codeSym]
  }
}

function getMessage(key, args) {
  const message = messageMap.get(key)

  if (typeof message == "function") {
    return message(...args)
  }

  args.unshift(message)
  return String(format(...args))
}

function invalidProtocol(protocol, expectedProtocol) {
  return "Protocol " + quote(protocol) +
    " not supported. Expected " + quote(expectedProtocol)
}

function quote(value) {
  return toStringLiteral(value, "'")
}

Object.setPrototypeOf(NodeError.prototype, null)

export default NodeError

