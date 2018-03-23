import ENTRY from "../../constant/entry.js"

import _load from "./_load.js"
import shared from "../../shared.js"

const {
  STATE_EXECUTION_COMPLETED,
  STATE_EXECUTION_STARTED,
  STATE_PARSING_COMPLETED
} = ENTRY

function load(request, parent, isMain, preload) {
  let entry

  shared.moduleState.parsing = true

  try {
    entry = _load(request, parent, isMain)
  } finally {
    shared.moduleState.parsing = false
  }

  if (entry.module.loaded) {
    entry.state = STATE_EXECUTION_COMPLETED

    if (preload) {
      preload(entry)
    }

    return entry
  }

  if (entry.state < STATE_EXECUTION_STARTED) {
    entry.state = STATE_PARSING_COMPLETED

    if (preload) {
      preload(entry)
    }

    if (! shared.moduleState.passthru) {
      _load(request, parent, isMain)
    }
  }

  if (entry.module.loaded) {
    entry.state = STATE_EXECUTION_COMPLETED
  }

  return entry
}

export default load
