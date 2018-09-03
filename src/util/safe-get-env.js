import binding from "../binding.js"
import { env } from "../safe/process.js"
import shared from "../shared.js"

function init() {
  let useSafeGetEnv

  function safeGetEnv(name) {
    if (useSafeGetEnv === void 0) {
      useSafeGetEnv = typeof binding.util.safeGetenv === "function"
    }

    if (useSafeGetEnv &&
        typeof name === "string") {
      try {
        return binding.util.safeGetenv(name)
      } catch {}
    }

    return env[name]
  }

  return safeGetEnv
}

export default shared.inited
  ? shared.module.utilSafeGetEnv
  : shared.module.utilSafeGetEnv = init()
