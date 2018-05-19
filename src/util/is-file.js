import shared from "../shared.js"
import stat from "../fs/stat.js"

function init() {
  return function isFile(thePath) {
    return stat(thePath) === 0
  }
}

export default shared.inited
  ? shared.module.utilIsFile
  : shared.module.utilIsFile = init()
