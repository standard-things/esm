import safe from "../util/safe.js"
import shared from "../shared.js"

export default shared.inited
  ? shared.Math
  : shared.Math = safe(Math)
