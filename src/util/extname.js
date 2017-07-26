import path from "path"

function extname(filePath) {
  const ext = path.extname(filePath)
  const prefix = ext === ".gz" ? path.extname(path.basename(filePath, ext)) : ""
  return prefix + ext
}

export default extname
