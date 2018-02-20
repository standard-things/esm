import Entry from "./entry.js"
import ExportProxy from "./export-proxy.js"
import Module from "./module.js"

import builtinModules from "./module/builtin-modules.js"
import copyProperty from "./util/copy-property.js"
import has from "./util/has.js"
import keysAll from "./util/keys-all.js"
import setDeferred from "./util/set-deferred.js"
import shared from "./shared.js"

const ExObject = __external__.Object

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

          exported = new ExObject

          for (const name of names) {
            if (name !== "Module") {
              copyProperty(exported, source, name)
            }
          }
        }
      }

      mod.exports = new ExportProxy(exported, {
        set(proxy, name, value) {
          exported[name] = value
          entry.update()
          return true
        }
      })

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
