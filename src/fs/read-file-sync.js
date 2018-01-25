import { readFileSync as _readFileSync } from "fs"
import isFile from "../util/is-file.js"
import stripBOM from "../util/strip-bom.js"

function readFileSync(filename, options) {
  let content = null

  if (isFile(filename)) {
    try {
      content = _readFileSync(filename, options)
    } catch (e) {}
  }

  if (content &&
      options === "utf8") {
    return stripBOM(content)
  }

  return content
}

export default readFileSync
