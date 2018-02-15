import safe from "../util/safe.js"
import shared from "../shared.js"

export default shared.inited
  ? shared.Array
  : shared.Array = safe(Array)
