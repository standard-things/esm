import shared from "../shared.js"
import statFast from "../fs/stat-fast.js"

function init() {
  function isFile(thePath) {
    return statFast(thePath) === 0
  }

  return isFile
}

export default shared.inited
  ? shared.module.utilIsFile
  : shared.module.utilIsFile = init()
