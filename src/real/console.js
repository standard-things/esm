import realRequire from "./require.js"
import shared from "../shared.js"
import unwrapProxy from "../util/unwrap-proxy.js"

export default shared.inited
  ? shared.module.realConsole
  : shared.module.realConsole = unwrapProxy(realRequire("console"))
