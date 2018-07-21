import isObject from "./is-object.js"
import shared from "../shared.js"

function init() {
  function getModuleName(mod) {
    if (isObject(mod)) {
      const { filename, id } = mod

      if (typeof filename === "string") {
        return filename
      }

      if (typeof id === "string") {
        return id
      }
    }

    return ""
  }

  return getModuleName
}

export default shared.inited
  ? shared.module.utilGetModuleName
  : shared.module.utilGetModuleName = init()
