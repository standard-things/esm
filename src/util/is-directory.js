import shared from "../shared.js"
import statFast from "../fs/stat-fast.js"

function init() {
  function isDirectory(thePath) {
    return statFast(thePath) === 1
  }

  return isDirectory
}

export default shared.inited
  ? shared.module.utilIsDirectory
  : shared.module.utilIsDirectory = init()
