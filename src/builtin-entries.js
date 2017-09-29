import Entry from "./entry.js"
import FastObject from "./fast-object.js"

import builtinModules from "./builtin-modules.js"
import keys from "./util/keys.js"
import setGetter from "./util/set-getter.js"
import setProperty from "./util/set-property.js"
import setSetter from "./util/set-setter.js"

const builtinEntries = keys(builtinModules)
  .reduce((object, id) => {
    setGetter(object, id, () => {
      const entry = Entry.get(builtinModules[id])
      entry.loaded()
      return object[id] = entry
    })

    setSetter(object, id, (value) => {
      setProperty(object, id, { value })
    })

    return object
  }, new FastObject)

export default builtinEntries
