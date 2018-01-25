import { mkdirSync } from "fs"

function mkdir(dirPath) {
  if (typeof dirPath === "string") {
    try {
      mkdirSync(dirPath)
      return true
    } catch (e) {}
  }

  return false
}

export default mkdir
