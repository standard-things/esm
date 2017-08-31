import FastObject from "./fast-object.js"

import setGetter from "./util/set-getter.js"
import setProperty from "./util/set-property.js"
import setSetter from "./util/set-setter.js"

const _binding = process.binding
const ids = ["config", "fs", "inspector", "natives", "util"]

const binding = ids.reduce((binding, id) => {
  setGetter(binding, id, () => {
    try {
      return binding[id] = _binding.call(process, id)
    } catch (e) {
      return binding[id] = Object.create(null)
    }
  })

  setSetter(binding, id, (value) => {
    setProperty(binding, id, { value })
  })

  return binding
}, new FastObject)

export default binding
