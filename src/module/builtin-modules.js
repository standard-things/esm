import SafeArray from "../builtin/array.js"
import SafeObject from "../builtin/object.js"

import binding from "../binding.js"
import keys from "../util/keys.js"
import shared from "../shared.js"

function init() {
  let { builtinModules } = __non_webpack_module__.constructor

  if (! SafeArray.isArray(builtinModules) ||
      ! SafeObject.isFrozen(builtinModules)) {
    builtinModules = keys(binding.natives)
      .filter((id) => ! id.startsWith("internal/"))

    SafeObject.freeze(builtinModules)
  }

  return builtinModules
}

export default shared.inited
  ? shared.builtinModules
  : shared.builtinModules = init()
