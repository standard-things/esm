import { Stats, statSync } from "../safe/fs.js"

import binding from "../binding.js"
import call from "../util/call.js"
import shared from "../shared.js"
import toNamespacedPath from "../path/to-namespaced-path.js"

function init() {
  let useFastPath

  const { isFile } = Stats.prototype

  function stat(thePath) {
    if (typeof thePath !== "string") {
      return -1
    }

    const cache = shared.moduleState.stat

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

    return statFallback(thePath)
  }

  function statFallback(thePath) {
    try {
      return call(isFile, statSync(thePath)) ? 0 : 1
    } catch (e) {}

    return -1
  }

  function statFastPath(thePath) {
    // Used to speed up loading. Returns 0 if the path refers to a file,
    // 1 when it's a directory or -1 on error (usually ENOENT). The speedup
    // comes from not creating thousands of Stat and Error objects.
    return binding.fs.internalModuleStat(toNamespacedPath(thePath))
  }

  return stat
}

export default shared.inited
  ? shared.module.fsStat
  : shared.module.fsStat = init()
