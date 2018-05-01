import safe from "../util/safe.js"
import shared from "../shared.js"

export default shared.inited
  ? shared.module.SafeBuffer
  : shared.module.SafeBuffer = safe(shared.external.Buffer)
