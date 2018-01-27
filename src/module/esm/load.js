import Entry from "../../entry.js"

import _load from "./_load.js"
import moduleState from "../state.js"

function load(request, parent, isMain, preload) {
  let entry

  moduleState.parsing = true

  try {
    entry = _load(request, parent, isMain)
  } finally {
    moduleState.parsing = false
  }

  if (entry.module.loaded) {
    entry.state = 4

    if (preload) {
      preload(entry)
    }

    return entry
  }

  if (entry.state < 3) {
    entry.state = 2

    if (preload) {
      preload(entry)
    }

    const parentEntry = Entry.get(parent)
    const parentCached = parentEntry && parentEntry.package.cache[parentEntry.cacheName]
    const parentIsESM = parentCached && parentCached.esm

    if (parentIsESM) {
      parent.require(request)
    } else {
      _load(request, parent, isMain)
    }
  }

  if (entry.module.loaded) {
    entry.state = 4
  }

  return entry
}

export default load
