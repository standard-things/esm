import { basename as _basename } from "../safe/path.js"
import shared from "../shared.js"

function init() {
  function basename(filename) {
    const cache = shared.memoize.pathBasename

    if (Reflect.has(cache, filename)) {
      return cache[filename]
    }

    return cache[filename] = _basename(filename)
  }

  return basename
}

export default shared.inited
  ? shared.module.pathBasename
  : shared.module.pathBasename = init()
