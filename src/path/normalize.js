import { resolve } from "path"

const backSlashRegExp = /\\/g

function normalize(filename) {
  return typeof filename === "string"
    ? resolve(filename).replace(backSlashRegExp, "/")
    : ""
}

export default normalize
