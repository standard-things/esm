import { readdirSync } from "../safe/fs.js"
import shared from "../shared.js"

function init() {
  return function readdir(dirPath) {
    if (typeof dirPath === "string") {
      try {
        return readdirSync(dirPath)
      } catch (e) {}
    }

    return null
  }
}

export default shared.inited
  ? shared.module.fsReaddir
  : shared.module.fsReaddir = init()
