import _load from "./_load.js"
import moduleState from "../state.js"

const parsingSym = Symbol.for("@std/esm:Module#parsing")

function parseAndLoad(id, parent, isMain, preload) {
  let child

  moduleState.parsing = true

  try {
    child = _load(id, parent, isMain)
  } finally {
    moduleState.parsing = false

    if (child &&
        ! child.loaded) {
      child[parsingSym] = false
    }
  }

  if (child.loaded) {
    return _load(id, parent, isMain, preload)
  }

  child = _load(id, parent, isMain, preload)
  return child
}

export default parseAndLoad
