import builtinLookup from "../builtin-lookup.js"
import { config } from "../safe/process.js"
import realRequire from "../real/require.js"
import shared from "../shared.js"

function init() {
  function hasInspector() {
    if (config.variables.v8_enable_inspector === 1) {
      return true
    }

    if (builtinLookup.has("inspector")) {
      // An `ERR_INSPECTOR_NOT_AVAILABLE` error may be thrown on initialization.
      try {
        realRequire("inspector")
        return true
      } catch {}
    }

    return false
  }

  return hasInspector
}

export default shared.inited
  ? shared.module.envHasInspector
  : shared.module.envHasInspector = init()
