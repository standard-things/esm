import binding from "../binding.js"
import shared from "../shared.js"
import statFastFallback from "./stat-fast-fallback.js"
import toNamespacedPath from "../path/to-namespaced-path.js"

function init() {
  let useFastPath

  function statFast(thePath) {
    if (typeof thePath !== "string") {
      return -1
    }

    const cache = shared.moduleState.statFast

    if (cache &&
        Reflect.has(cache, thePath)) {
      return cache[thePath]
    }

    const result = statBase(thePath)

    if (cache) {
      cache[thePath] = result
    }

    return result
  }

  function statBase(thePath) {
    if (useFastPath === void 0) {
      useFastPath = typeof binding.fs.internalModuleStat === "function"
    }

    if (useFastPath) {
      try {
        return statFastPath(thePath)
      } catch (e) {
        useFastPath = false
      }
    }

    return statFastFallback(thePath)
  }

  function statFastPath(thePath) {
    // Used to speed up loading. Returns 0 if the path refers to a file,
    // 1 when it's a directory, or a negative number on error (usually ENOENT).
    // The speedup comes from not creating thousands of Stat and Error objects.
    const result = typeof thePath === "string"
      ? binding.fs.internalModuleStat(toNamespacedPath(thePath))
      : -1

    return result < 0 ? -1 : result
  }

  return statFast
}

export default shared.inited
  ? shared.module.fsStatFast
  : shared.module.fsStatFast = init()
