import { Stats, statSync } from "fs"

import binding from "../binding.js"
import moduleState from "../module/state.js"
import noDeprecationWarning from "../warning/no-deprecation-warning.js"
import toNamespacedPath from "../path/to-namespaced-path.js"

const fsBinding = binding.fs
const internalModuleStat = noDeprecationWarning(() => fsBinding.internalModuleStat)
const { isFile } = Stats.prototype

let useStatFastPath = typeof internalModuleStat === "function"

function stat(filePath) {
  if (typeof filePath !== "string") {
    return -1
  }

  const cache = moduleState.stat

  if (cache &&
      filePath in cache) {
    return cache[filePath]
  }

  const result = baseStat(filePath)

  if (cache) {
    cache[filePath] = result
  }

  return result
}

function baseStat(filePath) {
  if (useStatFastPath) {
    try {
      return fastPathStat(filePath)
    } catch (e) {
      useStatFastPath = false
    }
  }

  return fallbackStat(filePath)
}

function fallbackStat(filePath) {
  try {
    return isFile.call(statSync(filePath)) ? 0 : 1
  } catch (e) {}

  return -1
}

function fastPathStat(filePath) {
  // Used to speed up loading. Returns 0 if the path refers to a file,
  // 1 when it's a directory or -1 on error (usually ENOENT). The speedup
  // comes from not creating thousands of Stat and Error objects.
  return internalModuleStat.call(fsBinding, toNamespacedPath(filePath))
}

export default stat
