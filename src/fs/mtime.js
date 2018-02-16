import GenericDate from "../generic/date.js"

import binding from "../binding"
import shared from "../shared.js"
import { statSync } from "fs"

function mtime(filename) {
  if (typeof filename !== "string") {
    return -1
  }

  const { fastPath } = shared

  if (fastPath.mtime) {
    try {
      return fastPathMtime(filename)
    } catch ({ code }) {
      if (code === "ENOENT") {
        return -1
      }

      fastPath.mtime = false
    }
  }

  return fallbackMtime(filename)
}

function fallbackMtime(filename) {
  try {
    return GenericDate.getTime(statSync(filename).mtime)
  } catch (e) {}
  return -1
}

function fastPathMtime(filename) {
  // Used to speed up file stats. Modifies the `statValues` typed array,
  // with index 11 being the mtime milliseconds stamp. The speedup comes
  // from not creating Stat objects.
  if (shared.support.getStatValues) {
    binding.fs.stat(filename)
  } else {
    binding.fs.stat(filename, shared.statValues)
  }

  return shared.statValues[11]
}

export default mtime
