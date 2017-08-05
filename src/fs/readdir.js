import { readdirSync } from "fs"

function readdir(dirPath) {
  try {
    return readdirSync(dirPath)
  } catch (e) {}
  return null
}

export default readdir
