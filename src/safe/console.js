import realConsole from "../real/console.js"
import safe from "../util/safe.js"
import shared from "../shared.js"

export default shared.inited
  ? shared.module.safeConsole
  : shared.module.safeConsole = safe(realConsole)
