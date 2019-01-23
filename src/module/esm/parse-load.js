import ENTRY from "../../constant/entry.js"

import cjsValidate from "../cjs/validate.js"
import esmValidate from "./validate.js"
import load from "./load.js"
import shared from "../../shared.js"

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

  if (entry.type === TYPE_ESM) {
    esmValidate(entry)
  }

  if (entry.state < STATE_PARSING_COMPLETED) {
    entry.state = STATE_PARSING_COMPLETED
  }

  load(request, parent, isMain)

  if (entry.type === TYPE_ESM) {
    cjsValidate(entry)
  }

  return entry
}

export default parseLoad
