import isObjectLike from "../util/is-object-like.js"
import realUtil from "../real/util.js"
import safe from "../util/safe.js"
import setProperty from "../util/set-property.js"
import shared from "../shared.js"

function init() {
  const safeUtil = safe(realUtil)
  const { inspect, types } = safeUtil

  let defaultInspectOptions = inspect.defaultOptions

  if (! isObjectLike(defaultInspectOptions)) {
    defaultInspectOptions = {
      breakLength: 60,
      colors: false,
      compact: true,
      customInspect: true,
      depth: 2,
      maxArrayLength: 100,
      showHidden: false,
      showProxy: false
    }
  }

  setProperty(safeUtil, "customInspectSymbol", inspect.custom)
  setProperty(safeUtil, "defaultInspectOptions", defaultInspectOptions)
  setProperty(safeUtil, "types", safe(types))

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
