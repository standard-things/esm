import realUtil from "../real/util.js"
import safe from "../util/safe.js"
import shared from "../shared.js"

function init() {
  const safeUtil = safe(realUtil)
  const { custom, defaultOptions } = safeUtil.inspect
  const { types } = safeUtil

  safeUtil.customInspectSymbol = custom
  safeUtil.defaultInspectOptions = defaultOptions || {
    breakLength: 60,
    colors: false,
    compact: true,
    customInspect: true,
    depth: 2,
    maxArrayLength: 100,
    showHidden: false,
    showProxy: false
  }

  if (types) {
    safeUtil.types = safe(types)
  }

  return safeUtil
}

const safeUtil = shared.inited
  ? shared.module.safeUtil
  : shared.module.safeUtil = init()

export const {
  customInspectSymbol,
  defaultInspectOptions,
  deprecate,
  inspect,
  types
} = safeUtil

export default safeUtil
