import builtinLookup from "../builtin-lookup.js"
import { dirname } from "../safe/path.js"
import getFilePathfromURL from "./get-file-path-from-url.js"
import isFileOrigin from "./is-file-origin.js"
import isObject from "./is-object.js"
import shared from "../shared.js"

function init() {
  function getModuleDirname(mod) {
    if (isObject(mod)) {
      const { path } = mod

      if (typeof path === "string") {
        return path
      }

      const { id } = mod

      if (builtinLookup.has(id)) {
        return ""
      }

      let { filename } = mod

      if (filename === null &&
          typeof id === "string") {
        filename = isFileOrigin(id)
          ? getFilePathfromURL(id)
          : id
      }

      if (typeof filename === "string") {
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
