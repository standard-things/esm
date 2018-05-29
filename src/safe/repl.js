import realREPL from "../real/repl.js"
import safe from "../util/safe.js"
import shared from "../shared.js"

const safeREPL = shared.inited
  ? shared.module.safeREPL
  : shared.module.safeREPL = safe(realREPL)

export const {
  REPLServer
} = safeREPL

export default safeREPL
