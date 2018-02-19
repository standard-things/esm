import binding from "../binding.js"
import shared from "../shared.js"

function safeToString(value) {
  if (typeof value === "string") {
    return value
  }

  try {
    return String(value)
  } catch (e) {}

  if (shared.support.safeToString) {
    try {
      return binding.util.safeToString(value)
    } catch (e) {}
  }

  return ""
}

export default safeToString
