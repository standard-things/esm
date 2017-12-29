import _load from "./_load.js"
import moduleState from "../state.js"

const preloadSym = Symbol.for("@std/esm:Module#preload")

function parseAndLoad(id, parent, isMain, preload) {
  let child

  moduleState.preload = true

  try {
    child = _load(id, parent, isMain)
  } finally {
    moduleState.preload = false

    if (child &&
        ! child.loaded) {
      child[preloadSym] = false
    }
  }

  if (child.loaded) {
    return _load(id, parent, isMain, preload)
  }

  child = _load(id, parent, isMain, preload)
  return child
}

export default parseAndLoad
