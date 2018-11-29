import builtinIds from "./builtin-ids.js"
import shared from "./shared.js"

function init() {
  return new Set(builtinIds)
}

export default shared.inited
  ? shared.module.builtinLookup
  : shared.module.builtinLookup = init()
