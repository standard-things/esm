import { _makeLong } from "path"
import binding from "../binding.js"
import { Stats, statSync } from "fs"

const { internalModuleStat } = binding.fs
const isFile = Stats.prototype.isFile

let useStatFastPath = typeof internalModuleStat === "function"

function stat(filePath) {
  const cache = stat.cache

  if (cache !== null) {
    const result = cache.get(filePath)
    if (result !== void 0) {
      return result
    }
  }

  const result = baseStat(filePath)
  if (cache !== null) {
    cache.set(filePath, result)
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
  return internalModuleStat(_makeLong(filePath))
}

stat.cache = null

export default stat
