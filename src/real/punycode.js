import builtinLookup from "../builtin-lookup.js"
import realRequire from "./require.js"
import shared from "../shared.js"
import unwrapProxy from "../util/unwrap-proxy.js"

function init() {
  return builtinLookup.has("punycode")
    ? unwrapProxy(realRequire("punycode"))
    : null
}

export default shared.inited
  ? shared.module.realPunycode
  : shared.module.realPunycode = init()
