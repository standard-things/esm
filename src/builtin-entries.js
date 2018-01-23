import Entry from "./entry.js"
import FastObject from "./fast-object.js"
import Module from "./module.js"

import builtinModules from "./module/builtin-modules.js"
import setGetter from "./util/set-getter.js"
import setProperty from "./util/set-property.js"
import setSetter from "./util/set-setter.js"

const builtinEntries = builtinModules
  .reduce((object, id) => {
    setGetter(object, id, () => {
      const mod = new Module(id, null)
      mod.exports = id === "module" ? Module : __non_webpack_require__(id)
      mod.loaded = true

      const entry = Entry.get(mod)
      entry.loaded()
      return object[id] = entry
    })

    setSetter(object, id, (value) => {
      setProperty(object, id, { value })
    })

    return object
  }, new FastObject)

export default builtinEntries
