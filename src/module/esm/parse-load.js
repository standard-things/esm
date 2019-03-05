import ENTRY from "../../constant/entry.js"

import load from "./load.js"
import shared from "../../shared.js"
import validateDeep from "./validate-deep.js"

const {
  STATE_PARSING_COMPLETED,
  TYPE_CJS
} = ENTRY

function parseLoad(request, parent, isMain) {
  const { moduleState } = shared

  moduleState.parsing = true
  moduleState.requireDepth += 1

  let entry

  try {
    entry = load(request, parent, isMain)
  } finally {
    moduleState.parsing = false
    moduleState.requireDepth -= 1
  }

  try {
    entry.updateBindings()

    if (entry.state === STATE_PARSING_COMPLETED) {
      if (entry.type !== TYPE_CJS) {
        validateDeep(entry)
      }

      load(request, parent, isMain)
    }
  } finally {
    moduleState.requireDepth -= 1
  }

  return entry
}

export default parseLoad
