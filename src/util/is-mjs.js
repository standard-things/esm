import { extname } from "path"
import isObject from "./is-object.js"

function isMJS(request) {
  if (typeof request === "string") {
    return extname(request) === ".mjs"
  }

  if (isObject(request)) {
    const { filename } = request

    if (typeof filename === "string") {
      return extname(filename) === ".mjs"
    }
  }

  return false
}

export default isMJS
