import ENTRY from "../../constant/entry.js"

import Module from "../../module.js"

import _load from "./_load.js"
import keys from "../../util/keys.js"
import shared from "../../shared.js"

const {
  STATE_EXECUTION_COMPLETED,
  STATE_EXECUTION_STARTED,
  STATE_PARSING_COMPLETED
} = ENTRY

function load(request, parent, isMain, preload) {
  let entry

  const { moduleState } = shared
  const parseCache = shared.parseState._cache
  const { parseOnly } = moduleState

  moduleState.parsing = true

  Reflect.setPrototypeOf(parseCache, Module._cache)

  try {
    entry = _load(request, parent, isMain)
  } finally {
    moduleState.parsing = false
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

    if (! parseOnly) {
      _load(request, parent, isMain)
    }
  }

  if (entry.module.loaded) {
    entry.state = STATE_EXECUTION_COMPLETED
  }

  const cacheKeys = keys(parseCache)

  for (const cacheKey of cacheKeys) {
    Module._cache[cacheKey] = parseCache[cacheKey]
    Reflect.deleteProperty(parseCache, cacheKey)
  }

  return entry
}

export default load
