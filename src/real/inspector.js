import builtinLookup from "../builtin-lookup.js"
import realRequire from "./require.js"
import shared from "../shared.js"
import unwrapProxy from "../util/unwrap-proxy.js"

function init() {
  return Reflect.has(builtinLookup, "inspector")
    ? unwrapProxy(realRequire("inspector"))
    : null
}

export default shared.inited
  ? shared.module.realInspector
  : shared.module.realInspector = init()
