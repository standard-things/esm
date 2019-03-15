import safe from "../util/safe.js"
import shared from "../shared.js"

export default shared.inited
  ? shared.module.safeJSON
  : shared.module.safeJSON = safe(shared.external.JSON)
