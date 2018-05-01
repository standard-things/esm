import safe from "../util/safe.js"
import shared from "../shared.js"

export default shared.inited
  ? shared.module.SafeJSON
  : shared.module.SafeJSON = safe(shared.external.JSON)
