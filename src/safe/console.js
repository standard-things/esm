import realRequire from "../real/require.js"
import safe from "../util/safe.js"
import shared from "../shared.js"

export default shared.inited
  ? shared.module.safeConsole
  : shared.module.safeConsole = safe(realRequire("console"))
