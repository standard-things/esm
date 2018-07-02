import shared from "../shared.js"
import stat from "../fs/stat.js"

function init() {
  function isDirectory(thePath) {
    return stat(thePath) === 1
  }

  return isDirectory
}

export default shared.inited
  ? shared.module.utilIsDirectory
  : shared.module.utilIsDirectory = init()
