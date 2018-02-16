import GenericArray from "../generic/array.js"
import GenericObject from "../generic/object.js"
import GenericString from "../generic/string.js"

import binding from "../binding.js"
import shared from "../shared.js"

function init() {
  let { builtinModules } = __non_webpack_module__.constructor

  if (! GenericArray.isArray(builtinModules) ||
      ! GenericObject.isFrozen(builtinModules)) {
    builtinModules = []

    for (const name in binding.natives) {
      if (! GenericString.startsWith(name, "internal/")) {
        GenericArray.push(builtinModules, name)
      }
    }

    GenericObject.freeze(builtinModules)
  }

  return builtinModules
}

export default shared.inited
  ? shared.builtinModules
  : shared.builtinModules = init()
