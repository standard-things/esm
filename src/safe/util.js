import util from "util"
import safe from "../util/safe.js"
import shared from "../shared.js"

const safeUtil = shared.inited
  ? shared.module.safeUtil
  : shared.module.safeUtil = safe(util)

export const {
  inspect,
  types
} = safeUtil

export default safeUtil
