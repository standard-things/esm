import { Stats, statSync } from "fs"

import binding from "../binding.js"
import moduleState from "../module/state.js"
import noDeprecationWarning from "../warning/no-deprecation-warning.js"
import toNamespacedPath from "../path/to-namespaced-path.js"

const fsBinding = binding.fs
const internalModuleStat = noDeprecationWarning(() => fsBinding.internalModuleStat)
const { isFile } = Stats.prototype

let useStatFastPath = typeof internalModuleStat === "function"

function stat(filename) {
  if (typeof filename !== "string") {
    return -1
  }

  const cache = moduleState.stat

  if (cache &&
      filename in cache) {
    return cache[filename]
  }

  const result = baseStat(filename)

  if (cache) {
    cache[filename] = result
  }

  return result
}

function baseStat(filename) {
  if (useStatFastPath) {
    try {
      return fastPathStat(filename)
    } catch (e) {
      useStatFastPath = false
    }
  }

  return fallbackStat(filename)
}

function fallbackStat(filename) {
  try {
    return isFile.call(statSync(filename)) ? 0 : 1
  } catch (e) {}

  return -1
}

function fastPathStat(filename) {
  // Used to speed up loading. Returns 0 if the path refers to a file,
  // 1 when it's a directory or -1 on error (usually ENOENT). The speedup
  // comes from not creating thousands of Stat and Error objects.
  return internalModuleStat.call(fsBinding, toNamespacedPath(filename))
}

export default stat
