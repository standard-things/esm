import builtinIds from "./builtin-ids.js"
import shared from "./shared.js"

function init() {
  const builtinLookup = { __proto__: null }

  for (const id of builtinIds) {
    builtinLookup[id] = true
  }

  return builtinLookup
}

export default shared.inited
  ? shared.module.builtinLookup
  : shared.module.builtinLookup = init()
