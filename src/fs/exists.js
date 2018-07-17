import shared from "../shared.js"
import statFast from "./stat-fast.js"

function init() {
  function exists(thePath) {
    return statFast(thePath) !== -1
  }

  return exists
}

export default shared.inited
  ? shared.module.fsExists
  : shared.module.fsExists = init()
