import { Stats } from "../safe/fs.js"

import binding from "../binding.js"
import shared from "../shared.js"
import statSync from "./stat-sync.js"
import toNamespacedPath from "../path/to-namespaced-path.js"

function init() {
  const { isFile } = Stats.prototype

  let useFastPath

  function statFast(thePath) {
    if (typeof thePath !== "string") {
      return -1
    }

    const cache = shared.moduleState.statFast

    let cached

    if (cache !== null) {
      cached = cache.get(thePath)

      if (cached !== void 0) {
        return cached
      }
    }

    cached = statBase(thePath)

    if (cache !== null) {
      cache.set(thePath, cached)
    }

    return cached
  }

  function statBase(thePath) {
    if (useFastPath === void 0) {
      useFastPath = typeof binding.fs.internalModuleStat === "function"
    }

    if (useFastPath) {
      try {
        return statFastPath(thePath)
      } catch {}

      useFastPath = false
    }

    return statFastFallback(thePath)
  }

  function statFastFallback(thePath) {
    const stat = statSync(thePath)

    if (stat !== null) {
      return Reflect.apply(isFile, stat, []) ? 0 : 1
    }

    return -1
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
