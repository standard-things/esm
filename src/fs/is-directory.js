import binding from "../binding/fs.js"
import fs from "fs"

const internalModuleStat = binding.internalModuleStat
let useIsDirectoryFastPath = typeof internalModuleStat === "function"

function isDirectory(thepath) {
  if (useIsDirectoryFastPath) {
    try {
      // Used to speed up loading. Returns 0 if the path refers to a file,
      // 1 when it's a directory or < 0 on error (usually ENOENT). The speedup
      // comes from not creating thousands of Stat and Error objects.
      return internalModuleStat(thepath) === 1
    } catch (e) {
      useIsDirectoryFastPath = false
    }
  }
  return fallbackIsDirectory(thepath)
}

function fallbackIsDirectory(filePath) {
  try {
    return fs.statSync(filePath).isDirectory()
  } catch (e) {}
  return false
}

export default isDirectory
