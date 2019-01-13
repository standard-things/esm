import ENTRY from "../../constant/entry.js"

import load from "./load.js"

const {
  STATE_EXECUTION_STARTED,
  STATE_PARSING_COMPLETED
} = ENTRY

function parse(request, parent, isMain, preload) {
  const entry = load(request, parent, isMain, preload)

  if (entry.compileData !== null &&
      entry.state < STATE_EXECUTION_STARTED) {
    entry.state = STATE_PARSING_COMPLETED
  }

  return entry
}

export default parse
