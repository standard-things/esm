import { isAbsolute as _isAbsolute } from "../safe/path.js"
import shared from "../shared.js"

function init() {
  function isAbsolute(filename) {
    const cache = shared.memoize.pathIsAbsolute

    if (Reflect.has(cache, filename)) {
      return cache[filename]
    }

    return cache[filename] = _isAbsolute(filename)
  }

  return isAbsolute
}

export default shared.inited
  ? shared.module.pathIsAbsolute
  : shared.module.pathIsAbsolute = init()
