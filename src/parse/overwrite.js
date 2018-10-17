import pad from "./pad.js"
import shared from "../shared.js"

function init() {
  function overwrite(visitor, start, end, content) {
    const { magicString } = visitor
    const padded = pad(magicString.original, content, start, end)

    return magicString.overwrite(start, end, padded)
  }

  return overwrite
}

export default shared.inited
  ? shared.module.parseOverwrite
  : shared.module.parseOverwrite = init()
