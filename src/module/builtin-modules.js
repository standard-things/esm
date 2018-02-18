import binding from "../binding.js"
import shared from "../shared.js"

const { isArray } = Array
const { freeze, isFrozen } = Object
const { slice } = Array.prototype

function init() {
  let { builtinModules } = __non_webpack_module__.constructor

  if (! isArray(builtinModules) ||
      ! isFrozen(builtinModules)) {
    builtinModules = []

    for (const name in binding.natives) {
      if (! name.startsWith("internal/")) {
        builtinModules.push(name)
      }
    }

  } else {
    builtinModules = slice.call(builtinModules)
  }

  return freeze(builtinModules)
}

export default shared.inited
  ? shared.builtinModules
  : shared.builtinModules = init()
