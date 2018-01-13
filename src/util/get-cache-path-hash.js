import { basename, extname } from "path"

function getCachePathHash(filePath) {
  return typeof filePath === "string"
    ? basename(filePath, extname(filePath)).slice(0, 8)
    : ""
}

export default getCachePathHash
