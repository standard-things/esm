import { basename, extname } from "path"

function getCachePathHash(filename) {
  return typeof filename === "string"
    ? basename(filename, extname(filename)).slice(0, 8)
    : ""
}

export default getCachePathHash
