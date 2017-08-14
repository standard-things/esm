import { format } from "util"
import toStringLiteral from "./util/to-string-literal.js"

const codeSym = Symbol.for("@std/esm:errorCode")
const messageMap = new Map

messageMap.set("ERR_REQUIRE_ESM", "Must use import to load ES Module: %s")
messageMap.set("MODULE_NOT_FOUND", moduleNotFound)

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

function moduleNotFound(id, fromPath, foundPath) {
  let message = "Module " + quote(id) + " not found"

  if (typeof fromPath === "string" &&
      typeof foundPath === "string") {
    message += " by `import` in " + quote(fromPath) +
      ", but would be found by `require` at " + quote(foundPath)
  }

  return message
}

function quote(value) {
  return toStringLiteral(value, "'")
}

Object.setPrototypeOf(NodeError.prototype, null)

export default NodeError

