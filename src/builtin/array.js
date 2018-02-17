import safe from "../util/safe.js"
import shared from "../shared.js"

export default shared.inited
  ? shared.builtin.Array
  : shared.builtin.Array = safe(__external__.Array)
