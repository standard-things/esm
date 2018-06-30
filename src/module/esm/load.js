import ENTRY from "../../constant/entry.js"

import _load from "./_load.js"
import shared from "../../shared.js"

const {
  STATE_EXECUTION_COMPLETED,
  STATE_EXECUTION_STARTED,
  STATE_PARSING_COMPLETED
} = ENTRY

function load(request, parent, isMain, preload) {
  const { moduleState } = shared
  const { parseOnly } = moduleState

  moduleState.parsing = true

  let entry

  try {
    entry = _load(request, parent, isMain, preload)
  } finally {
    moduleState.parsing = false
  }

  if (entry.module.loaded) {
    entry.state = STATE_EXECUTION_COMPLETED
    return entry
  }

  if (entry.state < STATE_EXECUTION_STARTED) {
    entry.state = STATE_PARSING_COMPLETED

    if (! parseOnly) {
      _load(request, parent, isMain)
    }
  }

  if (entry.module.loaded) {
    entry.state = STATE_EXECUTION_COMPLETED
  }

  return entry
}

export default load
