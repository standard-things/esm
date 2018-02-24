import safe from "../util/safe.js"
import shared from "../shared.js"

export default shared.inited
  ? shared.safe.Array
  : shared.safe.Array = safe(__external__.Array)
