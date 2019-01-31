import builtinLookup from "../builtin-lookup.js"
import { config } from "../safe/process.js"
import isObjectLike from "../util/is-object-like.js"
import safeRequire from "../safe/require.js"
import shared from "../shared.js"

function init() {
  function hasInspector() {
    if (config.variables.v8_enable_inspector === 1) {
      return true
    }

    // Use `safeRequire()` because an `ERR_INSPECTOR_NOT_AVAILABLE` error may
    // be thrown on initialization.
    return builtinLookup.has("inspector") &&
      isObjectLike(safeRequire("inspector"))
  }

  return hasInspector
}

export default shared.inited
  ? shared.module.envHasInspector
  : shared.module.envHasInspector = init()
