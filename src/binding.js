import FastObject from "./fast-object.js"
import NullObject from "./null-object.js"

import isObjectLike from "./util/is-object-like.js"
import noDeprecationWarning from "./warning/no-deprecation-warning.js"
import setDeferred from "./util/set-deferred.js"
import setGetter from "./util/set-getter.js"

let _binding

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
    "setHiddenValue"
  ]
}

const binding = ids
  .reduce((binding, id) =>
    setDeferred(binding, id, () => {
      if (! _binding) {
        _binding = noDeprecationWarning(() => process.binding)
      }

      const source = noDeprecationWarning(() => _binding.call(process, id))

      if (! isObjectLike(source)) {
        return new NullObject
      }

      const names = map[id]

      if (! names) {
        return source
      }

      const object = new NullObject

      for (const name of names) {
        setGetter(object, name, () => {
          const value = noDeprecationWarning(() => source[name])

          return typeof value === "function"
            ? (...args) => value.apply(source, args)
            : value
        })
      }

      return object
    })
  , new FastObject)

export default binding
