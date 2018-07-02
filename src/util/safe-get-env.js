import binding from "../binding.js"
import shared from "../shared.js"

function init() {
  function safeGetEnv(name) {
    if (typeof name === "string" &&
        shared.support.safeGetEnv) {
      try {
        return binding.util.safeGetenv(name)
      } catch (e) {}
    }
  }

  return safeGetEnv
}

export default shared.inited
  ? shared.module.utilSafeGetEnv
  : shared.module.utilSafeGetEnv = init()
