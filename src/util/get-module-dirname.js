import builtinModules from "../module/builtin-modules.js"
import { dirname } from "../safe/path.js"
import isObject from "./is-object.js"

function getModuleDirname(request) {
  if (typeof request === "string") {
    return Reflect.has(builtinModules, request) ? "" : dirname(request)
  }

  if (isObject(request)) {
    if (Reflect.has(builtinModules, request.id)) {
      return ""
    }

    const { filename } = request

    if (typeof filename === "string") {
      return dirname(filename)
    }
  }

  return "."
}

export default getModuleDirname
