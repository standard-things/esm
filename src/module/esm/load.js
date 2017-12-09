import _load from "./_load.js"
import builtinModules from "../../builtin-modules.js"

function load(id, parent, isMain) {
  return id in builtinModules
    ? builtinModules[id].exports
    : _load(id, parent, isMain).exports
}

export default load
