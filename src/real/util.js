import realRequire from "./require.js"
import shared from "../shared.js"
import unwrapProxy from "../util/unwrap-proxy.js"

const realUtil = shared.inited
  ? shared.module.realUtil
  : shared.module.realUtil = unwrapProxy(realRequire("util"))

export const {
  inspect,
  types
} = realUtil

export default realUtil
