import { extname as _extname } from "../safe/path.js"
import shared from "../shared.js"

function dirname(filename) {
  const cache = shared.memoize.pathExtname

  if (typeof filename === "string" &&
      Reflect.has(cache, filename)) {
    return cache[filename]
  }

  return cache[filename] = _extname(filename)
}

export default dirname
