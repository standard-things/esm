import binding from "../binding"
import { satisfies } from "semver"
import { statSync } from "fs"

const { getStatValues, stat } = binding.fs

let useMtimeFastPath = typeof stat === "function" &&
  satisfies(process.version, "^6.10.1||>=7.7")

let statValues
const useGetStatValues = typeof getStatValues === "function"

if (useMtimeFastPath) {
  statValues = useGetStatValues ? getStatValues() : new Float64Array(14)
}

function mtime(filePath) {
  if (useMtimeFastPath) {
    try {
      return fastPathMtime(filePath)
    } catch ({ code }) {
      if (code === "ENOENT") {
        return -1
      }
      useMtimeFastPath = false
    }
  }
  return fallbackMtime(filePath)
}

function fallbackMtime(filePath) {
  try {
    return statSync(filePath).mtime.getTime()
  } catch (e) {}
  return -1
}

function fastPathMtime(filePath) {
  // Used to speed up file stats. Modifies the `statValues` typed array,
  // with index 11 being the mtime milliseconds stamp. The speedup comes
  // from not creating Stat objects.
  if (useGetStatValues) {
    stat(filePath)
  } else {
    stat(filePath, statValues)
  }

  return statValues[11]
}

export default mtime
