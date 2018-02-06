import Entry from "./entry.js"
import Module from "./module.js"

import builtinModules from "./module/builtin-modules.js"
import setGetter from "./util/set-getter.js"
import setProperty from "./util/set-property.js"
import setSetter from "./util/set-setter.js"
import shared from "./shared.js"

function init(builtinEntries) {
  return builtinModules
    .reduce((builtinEntries, id) => {
      setGetter(builtinEntries, id, () => {
        const mod = new Module(id, null)
        mod.exports = id === "module" ? Module : __non_webpack_require__(id)
        mod.loaded = true

        const entry = Entry.get(mod)
        entry.builtin = true
        entry.loaded()
        return builtinEntries[id] = entry
      })

      setSetter(builtinEntries, id, (value) => {
        setProperty(builtinEntries, id, { value })
      })

      return builtinEntries
    }, builtinEntries)
}

export default shared.inited
  ? shared.builtinEntries
  : init(shared.builtinEntries)

