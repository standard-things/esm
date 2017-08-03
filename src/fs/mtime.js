import SemVer from "semver"

import binding from "../binding/fs.js"
import fs from "fs"

const internalStat = binding.stat
const internalStatValues = binding.getStatValues

let useMtimeFastPath = typeof internalStat === "function" &&
  SemVer.satisfies(process.version, "^6.10.1||>=7.7")

let statValues
const useInternalStatValues = typeof internalStatValues === "function"

if (useMtimeFastPath) {
  statValues = useInternalStatValues
    ? internalStatValues()
    : new Float64Array(14)
}

function mtime(filePath) {
  if (useMtimeFastPath) {
    try {
      return fastPathMtime(filePath)
    } catch (e) {
      if (e.code === "ENOENT") {
        return -1
      }
      useMtimeFastPath = false
    }
  }
  return fallbackMtime(filePath)
}

function fallbackMtime(filePath) {
  try {
    return fs.statSync(filePath).mtime.getTime()
  } catch (e) {}
  return -1
}

function fastPathMtime(filePath) {
  // Used to speed up file stats. Modifies the `statValues` typed array,
  // with index 11 being the mtime milliseconds stamp. The speedup comes
  // from not creating Stat objects.
  if (useInternalStatValues) {
    internalStat(filePath)
  } else {
    internalStat(filePath, statValues)
  }

  return statValues[11]
}

export default mtime
