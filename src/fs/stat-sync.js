import { statSync as _statSync, Stats } from "../safe/fs.js"

import ENV from "../constant/env.js"

import setPrototypeOf from "../util/set-prototype-of.js"
import shared from "../shared.js"

function init() {
  const {
    ELECTRON
  } = ENV

  const { prototype } = Stats

  function statSync(thePath) {
    if (typeof thePath !== "string") {
      return null
    }

    const cache = shared.moduleState.statSync

    let cached

    if (cache) {
      cached = cache.get(thePath)

      if (cached !== void 0) {
        return cached
      }
    }

    try {
      cached = _statSync(thePath)

      // Electron and Muon return a plain object for asar files.
      // https://github.com/electron/electron/blob/master/lib/common/asar.js
      // https://github.com/brave/muon/blob/master/lib/common/asar.js
      if (ELECTRON &&
          ! (cached instanceof Stats)) {
        setPrototypeOf(cached, prototype)
      }
    } catch {
      cached = null
    }

    if (cache) {
      cache.set(thePath, cached)
    }

    return cached
  }

  return statSync
}

export default shared.inited
  ? shared.module.fsStatSync
  : shared.module.fsStatSync = init()
