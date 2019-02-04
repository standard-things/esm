import ENTRY from "../../constant/entry.js"

import load from "./load.js"
import shared from "../../shared.js"
import validateDeep from "./validate-deep.js"

const {
  STATE_PARSING_COMPLETED,
  TYPE_ESM
} = ENTRY

function parseLoad(request, parent, isMain) {
  const { moduleState } = shared

  moduleState.parsing = true

  let entry

  try {
    entry = load(request, parent, isMain)
  } finally {
    moduleState.parsing = false
  }

  entry.updateBindings()

  if (entry.state === STATE_PARSING_COMPLETED) {
    if (entry.type === TYPE_ESM) {
      validateDeep(entry)
    }

    load(request, parent, isMain)
  }

  return entry
}

export default parseLoad
