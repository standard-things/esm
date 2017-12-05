import { readFileSync as _readFileSync } from "fs"
import isFile from "../util/is-file.js"
import stripBOM from "../util/strip-bom.js"

function readFileSync(filePath, options) {
  let content = null

  if (isFile(filePath)) {
    try {
      content = _readFileSync(filePath, options)
    } catch (e) {}
  }

  if (content &&
      options === "utf8") {
    return stripBOM(content)
  }

  return content
}

export default readFileSync
