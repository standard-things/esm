import realConsole from "../real/console.js"
import safe from "../util/safe.js"
import setProperty from "../util/set-property.js"
import shared from "../shared.js"

function init() {
  const safeConsole = safe(realConsole)

  setProperty(safeConsole, "Console", safe(safeConsole.Console))

  return safeConsole
}

export default shared.inited
  ? shared.module.safeConsole
  : shared.module.safeConsole = init()
