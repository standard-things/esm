import isObject from "./is-object.js"
import shared from "../shared.js"

function init() {
  function getModuleName(mod) {
    if (isObject(mod)) {
      const { filename, id } = mod

      if (typeof id === "string") {
        if (id === "." &&
            typeof filename === "string") {
          return filename
        }

        return id
      }

      if (typeof filename === "string") {
        return filename
      }
    }

    return ""
  }

  return getModuleName
}

export default shared.inited
  ? shared.module.utilGetModuleName
  : shared.module.utilGetModuleName = init()
