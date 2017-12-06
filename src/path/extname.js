import { extname as _extname, basename } from "path"

function extname(filePath) {
  const ext = typeof filePath === "string" ? _extname(filePath) : ""
  const prefix = ext === ".gz" ? _extname(basename(filePath, ext)) : ""
  return prefix + ext
}

export default extname
