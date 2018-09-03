import { readFileSync } from "../safe/fs.js"
import shared from "../shared.js"
import stripBOM from "../util/strip-bom.js"

function init() {
  function readFile(filename, options) {
    let content = null

    try {
      content = readFileSync(filename, options)
    } catch {}

    if (content &&
        options === "utf8") {
      return stripBOM(content)
    }

    return content
  }

  return readFile
}

export default shared.inited
  ? shared.module.fsReadFile
  : shared.module.fsReadFile = init()
