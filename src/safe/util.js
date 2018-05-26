import realUtil from "../real/util.js"
import safe from "../util/safe.js"
import shared from "../shared.js"

function init() {
  const safeUtil = safe(realUtil)
  const { types } = safeUtil

  if (types) {
    safeUtil.types = safe(types)
  }

  safeUtil.customInspectSymbol = safeUtil.inspect.custom
  return safeUtil
}

const safeUtil = shared.inited
  ? shared.module.safeUtil
  : shared.module.safeUtil = init()

export const {
  customInspectSymbol,
  inspect,
  types
} = safeUtil

export default safeUtil
