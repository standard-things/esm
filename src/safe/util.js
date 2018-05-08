import realRequire from "../real/require.js"
import safe from "../util/safe.js"
import shared from "../shared.js"

function init() {
  const safeUtil = safe(realRequire("util"))
  const { types } = safeUtil

  if (types) {
    safeUtil.types = safe(types)
  }

  return safeUtil
}

const safeUtil = shared.inited
  ? shared.module.safeUtil
  : shared.module.safeUtil = init()

export const {
  inspect,
  types
} = safeUtil

export default safeUtil
