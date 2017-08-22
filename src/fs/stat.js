import { Stats, statSync } from "fs"
import binding from "../binding.js"
import toNamespacedPath from "../path/to-namespaced-path.js"

const { internalModuleStat } = binding.fs
const isFile = Stats.prototype.isFile

let useStatFastPath = typeof internalModuleStat === "function"

function stat(filePath) {
  const cache = stat.cache

  if (cache !== null && filePath in cache) {
    return cache[filePath]
  }

  const result = baseStat(filePath)
  if (cache !== null) {
    cache[filePath] = result
  }

  return result
}

function baseStat(filePath) {
  if (useStatFastPath) {
    try {
      return fallbackStat(filePath)
    } catch (e) {
      useStatFastPath = false
    }
  }
  return fallbackStat(filePath, options)
}

function fallbackStat(filePath) {
  try {
    return isFile.call(statSync(filePath)) ? 0 : 1
  } catch (e) {}
  return -1
}

function fastPathStat(filePath) {
  // Used to speed up loading. Returns 0 if the path refers to a file,
  // 1 when it's a directory or < 0 on error (usually ENOENT). The speedup
  // comes from not creating thousands of Stat and Error objects.
  return internalModuleStat(toNamespacedPath(filePath))
}

stat.cache = null

export default stat
