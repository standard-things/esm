import FastObject from "./fast-object.js"
import NullObject from "./null-object.js"

import isObjectLike from "./util/is-object-like.js"
import noDeprecationWarning from "./warning/no-deprecation-warning.js"
import setGetter from "./util/set-getter.js"
import setProperty from "./util/set-property.js"
import setSetter from "./util/set-setter.js"

const _binding = noDeprecationWarning(() => process.binding)
const ids = ["config", "fs", "icu", "inspector", "natives", "util"]

const binding = ids
  .reduce((binding, id) => {
    setGetter(binding, id, () => {
      const value = noDeprecationWarning(() => _binding.call(process, id))
      return binding[id] = isObjectLike(value) ? value : new NullObject
    })

    setSetter(binding, id, (value) => {
      setProperty(binding, id, { value })
    })

    return binding
  }, new FastObject)

export default binding
