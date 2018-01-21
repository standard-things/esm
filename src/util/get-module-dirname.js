import { dirname } from "path"
import isObject from "./is-object.js"

function getModuleDirname(request) {
  if (typeof request === "string") {
    return dirname(request)
  }

  if (isObject(request)) {
    const { filename } = request

    if (typeof filename === "string") {
      return dirname(filename)
    }
  }

  return "."
}

export default getModuleDirname
