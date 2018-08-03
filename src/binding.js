import GenericFunction from "./generic/function.js"

import getSilent from "./util/get-silent.js"
import isObjectLike from "./util/is-object-like.js"
import keys from "./util/keys.js"
import noop from "./util/noop.js"
import realProcess from "./real/process.js"
import setDeferred from "./util/set-deferred.js"
import shared from "./shared.js"
import silent from "./util/silent.js"

function init() {
  let _binding

  const ids = [
    "fs",
    "icu",
    "inspector",
    "natives",
    "util"
  ]

  const map = {
    __proto__: null,
    fs: [
      "realpath",
      "internalModuleReadFile",
      "internalModuleReadJSON",
      "internalModuleStat"
    ],
    icu: [
      "toUnicode"
    ],
    inspector: [
      "callAndPauseOnStart",
      "consoleCall",
      "open"
    ],
    util: [
      "decorated_private_symbol",
      "getProxyDetails",
      "isAnyArrayBuffer",
      "isArrayBuffer",
      "isDate",
      "isExternal",
      "isMap",
      "isMapIterator",
      "isRegExp",
      "isSet",
      "isSetIterator",
      "isSharedArrayBuffer",
      "safeGetenv",
      "setHiddenValue"
    ]
  }

  const binding = { __proto__: null }

  for (const id of ids) {
    setDeferred(binding, id, () => {
      if (_binding === void 0) {
        _binding = getSilent(realProcess, "binding")

        if (typeof _binding !== "function") {
          _binding = noop
        }
      }

      const source = silent(() => {
        try {
          return Reflect.apply(_binding, realProcess, [id])
        } catch (e) {}
      })

      const object = { __proto__: null }

      if (! isObjectLike(source)) {
        return object
      }

      const names =
        map[id] ||
        keys(source)

      for (const name of names) {
        setDeferred(object, name, () => {
          if (name === "consoleCall") {
            return silent(() => source[name])
          }

          const value = getSilent(source, name)

          return typeof value === "function"
            ? GenericFunction.bind(value, source)
            : value
        })
      }

      return object
    })
  }

  return binding
}

export default shared.inited
  ? shared.module.binding
  : shared.module.binding = init()
