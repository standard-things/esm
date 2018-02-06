import FastObject from "./fast-object.js"
import NullObject from "./null-object.js"

import isObjectLike from "./util/is-object-like.js"
import noDeprecationWarning from "./warning/no-deprecation-warning.js"
import setGetter from "./util/set-getter.js"
import setProperty from "./util/set-property.js"
import setSetter from "./util/set-setter.js"

const _binding = noDeprecationWarning(() => process.binding)

const ids = ["config", "fs", "icu", "inspector", "natives", "util"]

const map = {
  __proto__: null,
  config: [
    "preserveSymlinks"
  ],
  fs: [
    "getStatValues",
    "internalModuleReadFile",
    "internalModuleReadJSON",
    "internalModuleStat",
    "stat"
  ],
  icu: [
    "toUnicode"
  ],
  inspector: [
    "callAndPauseOnStart"
  ],
  util: [
    "arrow_message_private_symbol",
    "decorated_private_symbol",
    "getHiddenValue",
    "setHiddenValue"
  ]
}

const binding = ids
  .reduce((binding, id) => {
    setGetter(binding, id, () => {
      const source = noDeprecationWarning(() => _binding.call(process, id))

      if (! isObjectLike(source)) {
        return binding[id] = new NullObject
      }

      const names = map[id]

      if (! names) {
        return binding[id] = source
      }

      const object = new NullObject

      for (const name of names) {
        setGetter(object, name, () => {
          const value = noDeprecationWarning(() => source[name])

          return object[name] = typeof value === "function"
            ? (...args) => value.apply(source, args)
            : value
        })

        setSetter(object, name, (value) => {
          setProperty(object, name, { value })
        })
      }

      return binding[id] = object
    })

    setSetter(binding, id, (value) => {
      setProperty(binding, id, { value })
    })

    return binding
  }, new FastObject)

export default binding
