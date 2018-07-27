import { realpathNativeSync, realpathSync } from "../safe/fs.js"

import ENV from "../constant/env.js"

import binding from "../binding.js"
import shared from "../shared.js"
import toNamespacedPath from "../path/to-namespaced-path.js"

function init() {
  const {
    BRAVE,
    ELECTRON,
    WIN32
  } = ENV

  const useBindingOrNative =
    ! BRAVE &&
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

    if (useNative) {
      return realpathNative(thePath)
    }

    if (useBinding === void 0) {
      useBinding =
        useBindingOrNative &&
        typeof binding.fs.realpath === "function"
    }

    return useBinding
      ? realpathBinding(thePath)
      : realpathFallback(thePath)
  }

  function realpathBinding(thePath) {
    if (typeof thePath === "string") {
      try {
        return binding.fs.realpath(toNamespacedPath(thePath))
      } catch (e) {}
    }

    return realpathFallback(thePath)
  }

  function realpathFallback(thePath) {
    try {
      return realpathSync(thePath)
    } catch (e) {}

    return ""
  }

  function realpathNative(thePath) {
    try {
      return realpathNativeSync(thePath)
    } catch (e) {}

    return realpathFallback(thePath)
  }

  return realpath
}

export default shared.inited
  ? shared.module.fsRealpath
  : shared.module.fsRealpath = init()
