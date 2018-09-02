import { statSync as _statSync, Stats } from "../safe/fs.js"

import setPrototypeOf from "../util/set-prototype-of.js"
import shared from "../shared.js"

function init() {
  const { prototype } = Stats

  function statSync(thePath) {
    const cache = shared.moduleState.statSync

    if (cache &&
        Reflect.has(cache, thePath)) {
      return cache[thePath]
    }

    let result = null

    try {
      result = _statSync(thePath)

      // Electron and Muon return a plain object for asar files.
      // https://github.com/electron/electron/blob/master/lib/common/asar.js
      // https://github.com/brave/muon/blob/master/lib/common/asar.js
      if (! (result instanceof Stats)) {
        setPrototypeOf(result, prototype)
      }
    } catch (e) {}

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
