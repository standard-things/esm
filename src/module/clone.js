import Module from "../module.js"

import copyProperty from "../util/copy-property.js"
import keysAll from "../util/keys-all.js"

function clone(mod) {
  const cloned = new Module(mod.id, null)

  cloned.id = mod.id
  cloned.filename = mod.filename
  cloned.parent = mod.parent

  const names = keysAll(mod)

  for (const name of names) {
    if (name !== "constructor") {
      copyProperty(cloned, mod, name)
    }
  }

  return cloned
}

export default clone
