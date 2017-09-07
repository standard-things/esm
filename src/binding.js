import FastObject from "./fast-object.js"
import NullObject from "./null-object.js"

import isObjectLike from "./util/is-object-like.js"
import setGetter from "./util/set-getter.js"
import setProperty from "./util/set-property.js"
import setSetter from "./util/set-setter.js"

const _binding = process.binding
const ids = ["config", "fs", "inspector", "natives", "util"]

const binding = ids
  .reduce((binding, id) => {
    setGetter(binding, id, () => {
      let value

      try {
        value = _binding.call(process, id)
      } catch (e) {}

      return binding[id] = isObjectLike(value) ? value : new NullObject
    })

    setSetter(binding, id, (value) => {
      setProperty(binding, id, { value })
    })

    return binding
  }, new FastObject)

export default binding
