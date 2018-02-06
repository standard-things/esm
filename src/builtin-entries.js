import Entry from "./entry.js"
import FastObject from "./fast-object.js"
import Module from "./module.js"

import builtinModules from "./module/builtin-modules.js"
import setDeferred from "./util/set-deferred.js"
import shared from "./shared.js"

function init() {
  return builtinModules
    .reduce((builtinEntries, id) =>
      setDeferred(builtinEntries, id, () => {
        const mod = new Module(id, null)
        mod.exports = id === "module" ? Module : __non_webpack_require__(id)
        mod.loaded = true

        const entry = Entry.get(mod)
        entry.builtin = true
        entry.loaded()
        return entry
      })
    , new FastObject)
}

export default shared.inited
  ? shared.builtinEntries
  : shared.builtinEntries = init()

