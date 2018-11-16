import { realpathNativeSync, realpathSync } from "../safe/fs.js"

import ENV from "../constant/env.js"

import shared from "../shared.js"

function init() {
  const {
    ELECTRON,
    WIN32
  } = ENV

  const useNative =
    ! ELECTRON &&
    ! WIN32 &&
    typeof realpathNativeSync === "function"

  function realpath(thePath) {
    if (typeof thePath !== "string") {
      return ""
    }

    const cache = shared.memoize.fsRealpath

    let cached = cache.get(thePath)

    if (cached !== void 0) {
      return cached
    }

    cached = useNative
      ? realpathNative(thePath)
      : realpathFallback(thePath)

    cache.set(thePath, cached)
    return cached
  }

  function realpathFallback(thePath) {
    try {
      return realpathSync(thePath)
    } catch {}

    return ""
  }

  function realpathNative(thePath) {
    try {
      return realpathNativeSync(thePath)
    } catch {}

    return realpathFallback(thePath)
  }

  return realpath
}

export default shared.inited
  ? shared.module.fsRealpath
  : shared.module.fsRealpath = init()
