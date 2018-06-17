import extname from "../path/extname.js"
import isObject from "./is-object.js"

function isMJS(request) {
  if (typeof request === "string") {
    return request.length > 4 &&
      extname(request) === ".mjs"
  }

  if (isObject(request)) {
    const { filename } = request

    if (typeof filename === "string") {
      return filename.length > 4 &&
        extname(filename) === ".mjs"
    }
  }

  return false
}

export default isMJS
