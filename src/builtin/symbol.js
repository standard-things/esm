import safe from "../util/safe.js"
import shared from "../shared.js"

export default shared.inited
  ? shared.Symbol
  : shared.Symbol = safe(Symbol)
