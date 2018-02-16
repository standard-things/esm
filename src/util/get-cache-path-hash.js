import { basename, extname } from "path"

import GenericString from "../generic/string.js"

function getCachePathHash(filename) {
  return typeof filename === "string"
    ? GenericString.slice(basename(filename, extname(filename)), 0, 8)
    : ""
}

export default getCachePathHash
