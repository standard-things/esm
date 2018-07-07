import realInspector from "../real/inspector.js"
import safe from "../util/safe.js"
import shared from "../shared.js"

export default shared.inited
  ? shared.module.safeInspector
  : shared.module.safeInspector = safe(realInspector)
