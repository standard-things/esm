import pad from "./pad.js"
import shared from "../shared.js"

function init() {
  function overwrite(visitor, oldStart, oldEnd, newCode) {
    const { magicString } = visitor
    const padded = pad(magicString.original, newCode, oldStart, oldEnd)

    if (oldStart !== oldEnd) {
      magicString.overwrite(oldStart, oldEnd, padded)
    } else if (padded !== "") {
      magicString.prependLeft(oldStart, padded)
    }

    return magicString
  }

  return overwrite
}

export default shared.inited
  ? shared.module.parseOverwrite
  : shared.module.parseOverwrite = init()
