import extname from "./extname.js"
import path from "path"

function getCacheStateHash(filePath) {
  return path.basename(filePath, extname(filePath)).slice(-8)
}

export default getCacheStateHash
