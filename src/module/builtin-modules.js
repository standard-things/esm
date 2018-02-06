import binding from "../binding.js"
import shared from "../shared.js"

const { isArray } = Array
const { freeze, isFrozen, keys } = Object

function init() {
  let { builtinModules } = __non_webpack_module__.constructor

  if (! isArray(builtinModules) ||
      ! isFrozen(builtinModules)) {
    builtinModules = keys(binding.natives)
      .filter((id) => ! id.startsWith("internal/"))

    freeze(builtinModules)
  }

  return builtinModules
}

export default shared.inited
  ? shared.builtinModules
  : shared.builtinModules = init()
