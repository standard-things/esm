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

    if (entry.filePath) {
      _load(entry, parent, isMain, preload)
    }

    return entry
  }

  if (entry.state < 3) {
    entry.state = 2
    _load(entry, parent, isMain, preload)
  }

  entry.state = 4
  return entry
}

export default load
