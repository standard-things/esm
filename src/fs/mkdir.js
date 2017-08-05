import { mkdirSync } from "fs"

function mkdir(dirPath) {
  try {
    mkdirSync(dirPath)
    return true
  } catch (e) {}
  return false
}

export default mkdir
