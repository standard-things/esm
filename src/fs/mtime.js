import binding from "../binding"
import { satisfies } from "semver"
import { statSync } from "fs"

const { getStatValues, stat } = binding.fs

const useGetStatValues = typeof getStatValues === "function"

let useMtimeFastPath = typeof stat === "function" &&
  satisfies(process.version, "^6.10.1||>=7.7")

let statValues

if (useMtimeFastPath) {
  statValues = useGetStatValues
    ? getStatValues()
    : new Float64Array(14)
}

function mtime(filename) {
  if (typeof filename !== "string") {
    return -1
  }

  if (useMtimeFastPath) {
    try {
      return fastPathMtime(filename)
    } catch ({ code }) {
      if (code === "ENOENT") {
        return -1
      }

      useMtimeFastPath = false
    }
  }

  return fallbackMtime(filename)
}

function fallbackMtime(filename) {
  try {
    return statSync(filename).mtime.getTime()
  } catch (e) {}
  return -1
}

function fastPathMtime(filename) {
  // Used to speed up file stats. Modifies the `statValues` typed array,
  // with index 11 being the mtime milliseconds stamp. The speedup comes
  // from not creating Stat objects.
  if (useGetStatValues) {
    stat(filename)
  } else {
    stat(filename, statValues)
  }

  return statValues[11]
}

export default mtime
