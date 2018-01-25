import { extname as _extname, basename } from "path"

function extname(filename) {
  const ext = typeof filename === "string" ? _extname(filename) : ""
  const prefix = ext === ".gz" ? _extname(basename(filename, ext)) : ""

  return prefix + ext
}

export default extname
