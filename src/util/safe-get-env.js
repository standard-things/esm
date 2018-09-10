import binding from "../binding.js"
import getEnv from "./get-env.js"
import shared from "../shared.js"
import toString from "./to-string.js"

function init() {
  let useSafeGetEnv

  function safeGetEnv(name) {
    if (useSafeGetEnv === void 0) {
      useSafeGetEnv = typeof binding.util.safeGetenv === "function"
    }

    if (useSafeGetEnv) {
      try {
        return binding.util.safeGetenv(toString(name))
      } catch {}
    }

    return getEnv(name)
  }

  return safeGetEnv
}

export default shared.inited
  ? shared.module.utilSafeGetEnv
  : shared.module.utilSafeGetEnv = init()
