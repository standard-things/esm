import { readFileSync as _readFileSync } from "../safe/fs.js"
import isFile from "../util/is-file.js"
import shared from "../shared.js"
import stripBOM from "../util/strip-bom.js"

function init() {
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

  return readFileSync
}

export default shared.inited
  ? shared.module.fsReadFileSync
  : shared.module.fsReadFileSync = init()
