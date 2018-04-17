import { Stats, statSync } from "../safe/fs.js"

import binding from "../binding.js"
import call from "../util/call.js"
import shared from "../shared.js"
import toNamespacedPath from "../path/to-namespaced-path.js"

const { isFile } = Stats.prototype

function stat(filename) {
  if (typeof filename !== "string") {
    return -1
  }

  const cache = shared.moduleState.stat

  if (cache &&
      Reflect.has(cache, filename)) {
    return cache[filename]
  }

  const result = statBase(filename)

  if (cache) {
    cache[filename] = result
  }

  return result
}

function statBase(filename) {
  const { fastPath } = shared

  if (fastPath.stat) {
    try {
      return statFastPath(filename)
    } catch (e) {
      fastPath.stat = false
    }
  }

  return statFallback(filename)
}

function statFallback(filename) {
  try {
    return call(isFile, statSync(filename)) ? 0 : 1
  } catch (e) {}

  return -1
}

function statFastPath(filename) {
  // Used to speed up loading. Returns 0 if the path refers to a file,
  // 1 when it's a directory or -1 on error (usually ENOENT). The speedup
  // comes from not creating thousands of Stat and Error objects.
  return binding.fs.internalModuleStat(toNamespacedPath(filename))
}

export default stat
