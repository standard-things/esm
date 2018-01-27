import { readdirSync } from "fs"

function readdir(dirPath) {
  if (typeof dirPath === "string") {
    try {
      return readdirSync(dirPath)
    } catch (e) {}
  }

  return null
}

export default readdir
