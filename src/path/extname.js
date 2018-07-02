import { extname as _extname } from "../safe/path.js"
import shared from "../shared.js"

function init() {
  function extname(filename) {
    const cache = shared.memoize.pathExtname

    if (typeof filename === "string" &&
        Reflect.has(cache, filename)) {
      return cache[filename]
    }

    return cache[filename] = _extname(filename)
  }

  return extname
}

export default shared.inited
  ? shared.module.pathExtname
  : shared.module.pathExtname = init()
