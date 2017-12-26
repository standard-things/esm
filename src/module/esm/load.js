import _load from "./_load.js"
import builtinModules from "../../builtin-modules.js"
import moduleState from "../state.js"

function load(id, parent, isMain) {
  if (id in builtinModules) {
    return builtinModules[id].exports
  }

  let child

  moduleState.preload = true

  try {
    child = _load(id, parent, isMain)
  } finally {
    moduleState.preload = false

    if (child) {
      child.loaded = false
      child.preload = false
    }
  }

  return _load(id, parent, isMain).exports
}

export default load
