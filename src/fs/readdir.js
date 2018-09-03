import { readdirSync } from "../safe/fs.js"
import shared from "../shared.js"

function init() {
  function readdir(dirPath) {
    if (typeof dirPath === "string") {
      try {
        return readdirSync(dirPath)
      } catch {}
    }

    return null
  }

  return readdir
}

export default shared.inited
  ? shared.module.fsReaddir
  : shared.module.fsReaddir = init()
