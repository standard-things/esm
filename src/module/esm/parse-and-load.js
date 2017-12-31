import _load from "./_load.js"
import moduleState from "../state.js"

const stateSym = Symbol.for("@std/esm:Module#state")

function parseAndLoad(id, parent, isMain, preload) {
  let child

  moduleState.parsing = true

  try {
    child = _load(id, parent, isMain)
  } finally {
    moduleState.parsing = false
  }

  if (child.loaded) {
    return _load(id, parent, isMain, preload)
  }

  child[stateSym] = 2
  _load(id, parent, isMain, preload)

  child[stateSym] = 3
  return child
}

export default parseAndLoad
