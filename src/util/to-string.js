
import binding from "../binding.js"

const utilBinding = binding.util
const _safeToString = utilBinding.safeToString
const _toString = String

const useSafeToString = typeof safeToString === "function"

function safeToString(value) {
  if (useSafeToString) {
    try {
      return _safeToString.call(utilBinding, value)
    } catch (e) {}
  }

  return _toString(value)
}

function toString(value) {
  if (typeof value === "string") {
    return value
  }

  return value == null ? "" : safeToString(value)
}

export default toString
