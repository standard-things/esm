import binding from "../binding.js"
import builtinModules from "../builtin-modules.js"

let natives

function isBuiltinModule(id) {
  if (typeof id !== "string" ||
      id.startsWith("internal/")) {
    return false
  }

  if (id in builtinModules) {
    return true
  }

  if (natives === void 0) {
    natives = binding.natives
  }

  return id in natives
}

export default isBuiltinModule
