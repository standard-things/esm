import binding from "../binding.js"
import shared from "../shared.js"

function safeGetEnv(name) {
  if (typeof name === "string" &&
      shared.support.safeGetEnv) {
    try {
      return binding.util.safeGetenv(name)
    } catch (e) {}
  }
}

export default safeGetEnv
