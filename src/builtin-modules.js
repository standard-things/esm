import FastObject from "./fast-object.js"
import Module from "module"

import binding from "./binding.js"
import setGetter from "./util/set-getter.js"
import setProperty from "./util/set-property.js"
import setSetter from "./util/set-setter.js"

const builtinModules = Object
  .keys(binding.natives)
  .filter((id) => ! id.startsWith("internal/"))
  .reduce((object, id) => {
    setGetter(object, id, () => {
      const mod = new Module(id, null)
      mod.exports = mod.require(id)
      mod.loaded = true
      return object[id] = mod
    })

    setSetter(object, id, (value) => {
      setProperty(object, id, { value })
    })

    return object
  }, new FastObject)

export default builtinModules
