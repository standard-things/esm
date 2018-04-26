import { extname } from "../safe/path.js"
import isObject from "./is-object.js"
import shared from "../shared.js"

function init() {
  function isMJS(request) {
    if (typeof request === "string") {
      return isExtMJS(request)
    }

    if (isObject(request)) {
      const { filename } = request

      if (typeof filename === "string") {
        return isExtMJS(filename)
      }
    }

    return false
  }

  function isExtMJS(filename) {
    const cache = shared.memoize.utilIsMJS

    return Reflect.has(cache, filename)
      ? cache[filename]
      : cache[filename] = extname(filename) === ".mjs"
  }

  return isMJS
}

export default shared.inited
  ? shared.module.utilIsMJS
  : shared.module.utilIsMJS = init()
