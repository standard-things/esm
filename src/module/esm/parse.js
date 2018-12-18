import ENTRY from "../../constant/entry.js"

import load from "./load.js"
import shared from "../../shared.js"

const {
  STATE_EXECUTION_STARTED,
  STATE_PARSING_COMPLETED
} = ENTRY

function parse(request, parent, isMain, preload) {
  const { moduleState } = shared

  moduleState.parsing = true

  let entry

  try {
    entry = load(request, parent, isMain, preload)
  } finally {
    moduleState.parsing = false
  }

  if (entry.compileData !== null &&
      entry.state < STATE_EXECUTION_STARTED) {
    entry.state = STATE_PARSING_COMPLETED
  }

  return entry
}

export default parse
