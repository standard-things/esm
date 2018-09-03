import { realpathNativeSync, realpathSync } from "../safe/fs.js"

import ENV from "../constant/env.js"

import binding from "../binding.js"
import shared from "../shared.js"
import toNamespacedPath from "../path/to-namespaced-path.js"

function init() {
  const {
    ELECTRON,
    WIN32
  } = ENV

  const useBindingOrNative =
    ! ELECTRON &&
    ! WIN32

  const useNative =
    useBindingOrNative &&
    typeof realpathNativeSync === "function"

  let useBinding

  function realpath(thePath) {
    if (typeof thePath !== "string") {
      return ""
    }

    const cache = shared.memoize.fsRealpath
    const cached = cache[thePath]

    if (cached) {
      return cached
    }

    if (useNative) {
      return cache[thePath] = realpathNative(thePath)
    }

    if (useBinding === void 0) {
      useBinding =
        useBindingOrNative &&
        typeof binding.fs.realpath === "function"
    }

    return cache[thePath] = useBinding
      ? realpathBinding(thePath)
      : realpathFallback(thePath)
  }

  function realpathBinding(thePath) {
    if (typeof thePath === "string") {
      try {
        return binding.fs.realpath(toNamespacedPath(thePath))
      } catch {}
    }

    return realpathFallback(thePath)
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
