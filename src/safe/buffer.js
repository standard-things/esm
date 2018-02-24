import safe from "../util/safe.js"
import shared from "../shared.js"

export default shared.inited
  ? shared.safe.Buffer
  : shared.safe.Buffer = safe(__external__.Buffer)
