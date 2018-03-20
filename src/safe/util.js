import realRequire from "../real/require.js"
import safe from "../util/safe.js"
import shared from "../shared.js"

const safeUtil = shared.inited
  ? shared.module.safeUtil
  : shared.module.safeUtil = safe(realRequire("util"))

export const {
  inspect,
  types
} = safeUtil

export default safeUtil
