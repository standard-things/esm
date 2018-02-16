import safe from "../util/safe.js"
import shared from "../shared.js"

export default shared.inited
  ? shared.builtin.Symbol
  : shared.builtin.Symbol = safe(Symbol)
