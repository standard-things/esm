import builtinModules from "../../builtin-modules.js"
import parseAndLoad from "./parse-and-load.js"

function load(id, parent, isMain) {
  return id in builtinModules
    ? builtinModules[id].exports
    : parseAndLoad(id, parent, isMain).exports
}

export default load
