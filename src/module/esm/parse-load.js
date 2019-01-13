import ENTRY from "../../constant/entry.js"

import cjsValidate from "../cjs/validate.js"
import esmValidate from "./validate.js"
import load from "./load.js"
import parse from "./parse.js"
import shared from "../../shared.js"

const {
  STATE_EXECUTION_STARTED,
  STATE_PARSING_COMPLETED,
  TYPE_ESM
} = ENTRY

function parseLoad(request, parent, isMain) {
  const { moduleState } = shared

  moduleState.parsing = true

  let entry

  try {
    entry = parse(request, parent, isMain)
  } finally {
    moduleState.parsing = false
  }

  if (entry.type === TYPE_ESM) {
    esmValidate(entry)
  }

  if (entry.state < STATE_EXECUTION_STARTED) {
    entry.state = STATE_PARSING_COMPLETED

    load(request, parent, isMain)

    if (entry.type === TYPE_ESM) {
      cjsValidate(entry)
    }
  }

  return entry
}

export default parseLoad
