import { statSync as _statSync } from "../safe/fs.js"
import shared from "../shared.js"

function init() {
  function statSync(thePath) {
    const cache = shared.moduleState.statSync

    if (cache &&
        Reflect.has(cache, thePath)) {
      return cache[thePath]
    }

    const result = _statSync(thePath)

    if (cache) {
      cache[thePath] = result
    }

    return result
  }

  return statSync
}

export default shared.inited
  ? shared.module.fsStatSync
  : shared.module.fsStatSync = init()
