import maskFunction from "../util/mask-function.js"
import realConsole from "../real/console.js"
import safe from "../util/safe.js"
import setProperty from "../util/set-property.js"
import shared from "../shared.js"

function init() {
  const safeConsole = safe(realConsole)
  const { Console } = safeConsole

  setProperty(safeConsole, "Console", maskFunction(
    safe(Console),
    Console
  ))

  return safeConsole
}

export default shared.inited
  ? shared.module.safeConsole
  : shared.module.safeConsole = init()
