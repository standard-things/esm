import { basename, extname } from "path"

function getCacheStateHash(filename) {
  return typeof filename === "string"
    ? basename(filename, extname(filename)).slice(-8)
    : ""
}

export default getCacheStateHash
