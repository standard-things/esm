import { resolve } from "path"

const backSlashRegExp = /\\/g

function normalize(filename) {
  if (typeof filename !== "string") {
    return ""
  }

  const resolved = resolve(filename)
  return resolved.replace(backSlashRegExp, "/")
}

export default normalize
