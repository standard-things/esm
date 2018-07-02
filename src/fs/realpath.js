import { realpathSync } from "../safe/fs.js"
import shared from "../shared.js"

function init() {
  function realpath(thePath) {
    if (typeof thePath === "string") {
      try {
        return realpathSync(thePath)
      } catch (e) {}
    }

    return ""
  }

  return realpath
}

export default shared.inited
  ? shared.module.fsRealpath
  : shared.module.fsRealpath = init()
