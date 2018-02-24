import safe from "../util/safe.js"
import shared from "../shared.js"

export default shared.inited
  ? shared.safe.JSON
  : shared.safe.JSON = safe(__external__.JSON)
