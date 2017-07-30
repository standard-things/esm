import extname from "./extname.js"
import path from "path"

function getCachePathHash(filePath) {
  return path.basename(filePath, extname(filePath)).slice(0, 8)
}

export default getCachePathHash
