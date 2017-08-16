import binding from "../binding.js"
import { statSync } from "fs"

const { internalModuleStat } = binding.fs
let useStatFastPath = typeof internalModuleStat === "function"

function stat(filePath) {
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
    return statSync(filePath).isFile() ? 0 : 1
  } catch (e) {}
  return -1
}

function fastPathStat(filePath) {
  // Used to speed up loading. Returns 0 if the path refers to a file,
  // 1 when it's a directory or < 0 on error (usually ENOENT). The speedup
  // comes from not creating thousands of Stat and Error objects.
  return internalModuleStat(filePath)
}

export default stat
