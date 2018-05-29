import realRequire from "./require.js"
import shared from "../shared.js"
import unwrapProxy from "../util/unwrap-proxy.js"

export default shared.inited
  ? shared.module.realREPL
  : shared.module.realREPL = unwrapProxy(realRequire("repl"))
