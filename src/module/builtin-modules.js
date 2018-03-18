import GenericArray from "../generic/array.js"

import binding from "../binding.js"
import shared from "../shared.js"

function init() {
  let { builtinModules } = __non_webpack_module__.constructor

  if (! Array.isArray(builtinModules) ||
      ! Object.isFrozen(builtinModules)) {
    builtinModules = []

    for (const name in binding.natives) {
      if (! name.startsWith("internal/")) {
        builtinModules.push(name)
      }
    }

  } else {
    builtinModules = GenericArray.slice(builtinModules)
  }

  return Object.freeze(GenericArray.sort(builtinModules))
}

export default shared.inited
  ? shared.module.builtinModules
  : shared.module.builtinModules = init()
