import safe from "../util/safe.js"
import shared from "../shared.js"

export default shared.inited
  ? shared.module.SafeArray
  : shared.module.SafeArray = safe(__external__.Array)
