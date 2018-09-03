import builtinLookup from "../builtin-lookup.js"
import realRequire from "./require.js"
import shared from "../shared.js"
import unwrapProxy from "../util/unwrap-proxy.js"

function init() {
  if (Reflect.has(builtinLookup, "inspector")) {
    // An `ERR_INSPECTOR_NOT_AVAILABLE` error may be thrown on initialization.
    try {
      return unwrapProxy(realRequire("inspector"))
    } catch (e) {}
  }

  return null
}

export default shared.inited
  ? shared.module.realInspector
  : shared.module.realInspector = init()
