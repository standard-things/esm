import realConsole from "../real/console.js"
import safe from "../util/safe.js"
import shared from "../shared.js"

const safeConsole = shared.inited
  ? shared.module.safeConsole
  : shared.module.safeConsole = safe(realConsole)

export const {
  Console,
  error
} = safeConsole

export default safeConsole
