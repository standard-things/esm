import { realpathSync } from "../safe/fs.js"

import ENV from "../constant/env.js"

import binding from "../binding.js"
import isError from "../util/is-error.js"
import shared from "../shared.js"
import toNamespacedPath from "../path/to-namespaced-path.js"

function init() {
  const {
    ELECTRON,
    WIN32
  } = ENV

  const { realpathNativeSync } = shared

  const useBuiltin =
    ELECTRON ||
    WIN32

  const useNative =
    ! useBuiltin &&
    typeof realpathNativeSync === "function"

  let useBinding

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

    if (cached !== "") {
      cache.set(thePath, cached)
    }

    return cached
  }

  function realpathBinding(thePath) {
    if (typeof thePath === "string") {
      try {
        return binding.fs.realpath(toNamespacedPath(thePath))
      } catch {}
    }

    return ""
  }

  function realpathFallback(thePath) {
    try {
      return realpathSync(thePath)
    } catch (e) {
      if (isError(e) &&
          e.code === "ENOENT") {
        if (useBinding === void 0) {
          useBinding =
            ! useBuiltin &&
            ! shared.support.realpathNative &&
            typeof binding.fs.realpath === "function"
        }

        if (useBinding) {
          return realpathBinding(thePath)
        }
      }
    }

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
