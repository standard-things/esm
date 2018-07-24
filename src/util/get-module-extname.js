import builtinLookup from "../builtin-lookup.js"
import extname from "../path/extname.js"
import isObject from "./is-object.js"
import shared from "../shared.js"

function init() {
  function getModuleExtname(mod) {
    if (isObject(mod)) {
      const { filename } = mod

      if (Reflect.has(builtinLookup, mod.id)) {
        return ""
      } else if (typeof filename === "string") {
        return extname(filename)
      }
    }

    return ""
  }

  return getModuleExtname
}

export default shared.inited
  ? shared.module.utilGetModuleExtname
  : shared.module.utilGetModuleExtname = init()
