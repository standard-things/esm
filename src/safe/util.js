import has from "../util/has.js"
import isObjectLike from "../util/is-object-like.js"
import realUtil from "../real/util.js"
import safe from "../util/safe.js"
import setProperty from "../util/set-property.js"
import shared from "../shared.js"

function init() {
  const safeUtil = safe(realUtil)
  const { inspect } = safeUtil
  const { custom } = inspect

  // Node < 6.6.0 uses the property "inspect" as the custom inspection key
  // instead of the `util.inspect.custom` symbol.
  shared.customInspectKey = typeof custom === "symbol"
    ? custom
    : "inspect"

  let { defaultOptions } = inspect

  if (! isObjectLike(defaultOptions)) {
    defaultOptions = {
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

  shared.defaultInspectOptions = defaultOptions

  if (has(safeUtil, "types")) {
    setProperty(safeUtil, "types", safe(safeUtil.types))
  }

  return safeUtil
}

const safeUtil = shared.inited
  ? shared.module.safeUtil
  : shared.module.safeUtil = init()

export const {
  deprecate,
  inspect,
  types
} = safeUtil

export default safeUtil
