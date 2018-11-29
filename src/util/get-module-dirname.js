import builtinLookup from "../builtin-lookup.js"
import { dirname } from "../safe/path.js"
import isObject from "./is-object.js"
import shared from "../shared.js"

function init() {
  function getModuleDirname(mod) {
    if (isObject(mod)) {
      const { filename } = mod

      if (builtinLookup.has(mod.id)) {
        return ""
      } else if (typeof filename === "string") {
        return dirname(filename)
      }
    }

    return "."
  }

  return getModuleDirname
}

export default shared.inited
  ? shared.module.utilGetModuleDirname
  : shared.module.utilGetModuleDirname = init()
