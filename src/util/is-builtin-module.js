import binding from "../binding.js"
import builtinModules from "../builtin-modules.js"

const natives = Object
  .keys(binding.natives)
  .reduce((object, id) => {
    object[id] = true
    return object
  }, Object.create(null))

function isBuiltinModule(id) {
  if (typeof id !== "string" ||
      id.startsWith("internal/")) {
    return false
  }

  return id in builtinModules || id in natives
}

export default isBuiltinModule
