import GenericDate from "../generic/date.js"

import shared from "../shared.js"
import statSync from "../fs/stat-sync.js"

function init() {
  function getCtime(filename) {
    if (typeof filename === "string") {
      try {
        const stat = statSync(filename)
        const { ctimeMs } = stat

        // Add 0.5 to avoid rounding down.
        // https://github.com/nodejs/node/pull/12607
        return typeof ctimeMs === "number"
          ? Math.round(ctimeMs + 0.5)
          : GenericDate.getTime(stat.ctime)
      } catch {}
    }

    return -1
  }

  return getCtime
}

export default shared.inited
  ? shared.module.fsGetCtime
  : shared.module.fsGetCtime = init()
