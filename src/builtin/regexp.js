import safe from "../util/safe.js"
import shared from "../shared.js"

export default shared.inited
  ? shared.builtin.RegExp
  : shared.builtin.RegExp = safe(RegExp)
