import safe from "../util/safe.js"
import shared from "../shared.js"

export default shared.inited
  ? shared.Set
  : shared.Set = safe(Set)
