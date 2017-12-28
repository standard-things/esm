import _load from "./_load.js"
import moduleState from "../state.js"

const metaSym = Symbol.for("@std/esm:Module#meta")

function parseAndLoad(id, parent, isMain, preload) {
  let child

  moduleState.preload = true

  try {
    child = _load(id, parent, isMain)
  } finally {
    moduleState.preload = false

    if (child) {
      child.loaded = false
      child.preload = false
    }
  }

  return _load(id, parent, isMain, preload)
}

export default parseAndLoad
