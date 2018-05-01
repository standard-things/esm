import safe from "../util/safe.js"
import shared from "../shared.js"

export default shared.inited
  ? shared.module.SafeObject
  : shared.module.SafeObject = safe(shared.external.Object)
