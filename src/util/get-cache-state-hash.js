import { basename, extname } from "path"

function getCacheStateHash(filePath) {
  return typeof filePath === "string"
    ? basename(filePath, extname(filePath)).slice(-8)
    : ""
}

export default getCacheStateHash
