import { basename, extname } from "../safe/path.js"

function getCacheStateHash(filename) {
  return typeof filename === "string"
    ? basename(filename, extname(filename)).slice(-8)
    : ""
}

export default getCacheStateHash
