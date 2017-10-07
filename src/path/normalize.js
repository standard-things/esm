import { resolve } from "path"

const backSlashRegExp = /\\/g

function normalize(filePath) {
  return typeof filePath === "string"
    ? resolve(filePath).replace(backSlashRegExp, "/")
    : ""
}

export default normalize
