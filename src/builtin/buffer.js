import safe from "../util/safe.js"
import shared from "../shared.js"

export default shared.inited
  ? shared.Buffer
  : shared.Buffer = safe(Buffer)
