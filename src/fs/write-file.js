import shared from "../shared.js"
import { writeFileSync } from "../safe/fs.js"

function init() {
  function writeFile(filename, bufferOrString, options) {
    if (typeof filename === "string") {
      try {
        writeFileSync(filename, bufferOrString, options)
        return true
      } catch {}
    }

    return false
  }

  return writeFile
}

export default shared.inited
  ? shared.module.fsWriteFile
  : shared.module.fsWriteFile = init()
