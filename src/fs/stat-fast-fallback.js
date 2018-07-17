import { Stats } from "../safe/fs.js"

import call from "../util/call.js"
import shared from "../shared.js"
import statSync from "./stat-sync.js"

function init() {
  const { isFile } = Stats.prototype

  function statFastFallback(thePath) {
    try {
      return call(isFile, statSync(thePath)) ? 0 : 1
    } catch (e) {}

    return -1
  }

  return statFastFallback
}

export default shared.inited
  ? shared.module.fsStatFastFallback
  : shared.module.fsStatFastFallback = init()
