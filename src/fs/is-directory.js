import binding from "../binding/fs.js"
import { statSync } from "fs"

const internalModuleStat = binding.internalModuleStat
let useIsDirectoryFastPath = typeof internalModuleStat === "function"

function isDirectory(thePath) {
  if (useIsDirectoryFastPath) {
    try {
      return fastPathIsDirectory(thePath)
    } catch (e) {
      useIsDirectoryFastPath = false
    }
  }
  return fallbackIsDirectory(thePath)
}

function fallbackIsDirectory(thePath) {
  try {
    return statSync(thePath).isDirectory()
  } catch (e) {}
  return false
}

function fastPathIsDirectory(thePath) {
  // Used to speed up loading. Returns 0 if the path refers to a file,
  // 1 when it's a directory or < 0 on error (usually ENOENT). The speedup
  // comes from not creating thousands of Stat and Error objects.
  return internalModuleStat(thePath) === 1
}

export default isDirectory
