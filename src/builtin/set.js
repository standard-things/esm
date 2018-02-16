import safe from "../util/safe.js"
import shared from "../shared.js"

export default shared.inited
  ? shared.builtin.Set
  : shared.builtin.Set = safe(Set)
