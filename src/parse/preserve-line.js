import overwrite from "./overwrite.js"
import shared from "../shared.js"

function init() {
  function preserveLine(visitor, { end, start }) {
    return overwrite(visitor, start, end, "")
  }

  return preserveLine
}

export default shared.inited
  ? shared.module.parsePreserveLine
  : shared.module.parsePreserveLine = init()
