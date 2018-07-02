import getURLFromFilePath from "./get-url-from-file-path.js"
import isObject from "./is-object.js"
import isPath from "./is-path.js"
import shared from "../shared.js"

function init() {
  function getModuleURL(request) {
    if (typeof request === "string") {
      return isPath(request)
        ? getURLFromFilePath(request)
        : request
    }

    if (isObject(request)) {
      const { filename, id } = request

      if (typeof filename === "string") {
        return getURLFromFilePath(filename)
      }

      if (typeof id === "string") {
        return id
      }
    }

    return ""
  }

  return getModuleURL
}

export default shared.inited
  ? shared.module.utilGetModuleURL
  : shared.module.utilGetModuleURL = init()
