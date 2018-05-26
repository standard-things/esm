import builtinModules from "../module/builtin-modules.js"
import realRequire from "./require.js"
import shared from "../shared.js"
import unwrapProxy from "../util/unwrap-proxy.js"

function init() {
  return builtinModules.indexOf("punycode") === -1
    ? null
    : unwrapProxy(realRequire("punycode"))
}

export default shared.inited
  ? shared.module.realPunycode
  : shared.module.realPunycode = init()
