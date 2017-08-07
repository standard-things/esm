import { format } from "util"
import toStringLiteral from "./util/to-string-literal.js"

const codeSym = Symbol.for("@std/esm:errorCode")
const messageMap = new Map

messageMap.set("ERR_REQUIRE_ESM", "Must use import to load ES Module: %s")
messageMap.set("MODULE_NOT_FOUND", (id) => "Module " + toStringLiteral(id, "'") + "not found")

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

Object.setPrototypeOf(NodeError.prototype, null)

export default NodeError

