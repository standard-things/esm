import shared from "../shared.js"
import stat from "./stat.js"

function init() {
  function exists(thePath) {
    return stat(thePath) !== -1
  }

  return exists
}

export default shared.inited
  ? shared.module.fsExists
  : shared.module.fsExists = init()
