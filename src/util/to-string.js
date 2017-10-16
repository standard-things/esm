
import { Buffer } from "buffer"

import binding from "../binding.js"

const bufferToString = Buffer.prototype.toString
const utilBinding = binding.util

const _String = String
const _safeToString = utilBinding.safeToString

const useSafeToString = typeof safeToString === "function"

function safeToString(value) {
  if (useSafeToString) {
    try {
      return _safeToString.call(utilBinding, value)
    } catch (e) {}
  }

  return _String(value)
}

function toString(value) {
  if (typeof value === "string") {
    return value
  }

  if (value == null) {
    return ""
  }

  return value instanceof Buffer
    ? bufferToString.call(value)
    : safeToString(value)
}

export default toString
