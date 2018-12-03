import ENTRY from "../../constant/entry.js"

import load from "./load.js"
import parse from "./parse.js"

const {
  STATE_EXECUTION_STARTED,
  STATE_PARSING_COMPLETED
} = ENTRY

function parseLoad(request, parent, isMain) {
  const entry = parse(request, parent, isMain)

  if (entry.state < STATE_EXECUTION_STARTED) {
    entry.state = STATE_PARSING_COMPLETED
    load(request, parent, isMain)
  }

  return entry
}

export default parseLoad
