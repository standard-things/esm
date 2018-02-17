import Entry from "./entry.js"
import Module from "./module.js"

import builtinModules from "./module/builtin-modules.js"
import copyProperty from "./util/copy-property.js"
import has from "./util/has.js"
import keysAll from "./util/keys-all.js"
import setDeferred from "./util/set-deferred.js"
import shared from "./shared.js"

function init() {
  const builtinEntries = { __proto__: null }

  for (const id of builtinModules) {
    setDeferred(builtinEntries, id, () => {
      let exported
      const mod = new Module(id, null)

      if (id === "module") {
        exported = Module
      } else {
        exported = __non_webpack_require__(id)

        if (id === "vm" &&
            has(exported, "Module")) {
          const source = exported
          const names = keysAll(source)

          exported = new Object

          for (const name of names) {
            if (name !== "Module") {
              copyProperty(exported, source, name)
            }
          }
        }
      }

      mod.exports = exported
      mod.loaded = true

      const entry = Entry.get(mod)
      entry.builtin = true
      entry.loaded()
      return entry
    })
  }

  return builtinEntries
}

export default shared.inited
  ? shared.builtinEntries
  : shared.builtinEntries = init()

