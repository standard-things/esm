import { basename, extname } from "path"

import GenericString from "../generic/string.js"

function getCacheStateHash(filename) {
  return typeof filename === "string"
    ? GenericString.slice(basename(filename, extname(filename)), -8)
    : ""
}

export default getCacheStateHash
