import { basename } from "path"
import extname from "./extname.js"

function getCachePathHash(filePath) {
  return basename(filePath, extname(filePath)).slice(0, 8)
}

export default getCachePathHash
