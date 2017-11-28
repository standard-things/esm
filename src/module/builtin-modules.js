import binding from "../binding.js"

let { builtinModules } = __non_webpack_module__.constructor

if (! Array.isArray(builtinModules) ||
    ! Object.isFrozen(builtinModules)) {
  builtinModules = Object
    .keys(binding.natives)
    .filter((id) => ! id.startsWith("internal/"))

  Object.freeze(builtinModules)
}

export default builtinModules
