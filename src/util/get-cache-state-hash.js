import { basename } from "path"
import extname from "./extname.js"

function getCacheStateHash(filePath) {
  return basename(filePath, extname(filePath)).slice(-8)
}

export default getCacheStateHash
