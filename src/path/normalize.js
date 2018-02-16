import GenericString from "../generic/string.js"

import { resolve } from "path"

const backSlashRegExp = /\\/g

function normalize(filename) {
  if (typeof filename !== "string") {
    return ""
  }

  const resolved = resolve(filename)
  return GenericString.replace(resolved, backSlashRegExp, "/")
}

export default normalize
