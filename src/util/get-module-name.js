import isObject from "./is-object.js"
import shared from "../shared.js"

function init() {
  function getModuleName(request) {
    if (typeof request === "string") {
      return request
    }

    if (isObject(request)) {
      const { filename, id } = request

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
