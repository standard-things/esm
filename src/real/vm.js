import realRequire from "./require.js"
import shared from "../shared.js"
import unwrapProxy from "../util/unwrap-proxy.js"

export default shared.inited
  ? shared.module.realVM
  : shared.module.realVM = unwrapProxy(realRequire("vm"))
