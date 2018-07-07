import getSilent from "./util/get-silent.js"
import isObjectLike from "./util/is-object-like.js"
import realProcess from "./real/process.js"
import setDeferred from "./util/set-deferred.js"
import setGetter from "./util/set-getter.js"
import shared from "./shared.js"
import silent from "./util/silent.js"

function init() {
  let _binding

  const ids = [
    "config",
    "fs",
    "icu",
    "inspector",
    "natives",
    "util"
  ]

  const map = {
    __proto__: null,
    config: [
      "experimentalREPLAwait",
      "experimentalWorker",
      "exposeInternals",
      "preserveSymlinks",
      "preserveSymlinksMain"
    ],
    fs: [
      "internalModuleReadFile",
      "internalModuleReadJSON",
      "internalModuleStat"
    ],
    icu: [
      "toUnicode"
    ],
    inspector: [
      "callAndPauseOnStart",
      "open"
    ],
    util: [
      "decorated_private_symbol",
      "getProxyDetails",
      "isAnyArrayBuffer",
      "isArrayBuffer",
      "isDataView",
      "isDate",
      "isExternal",
      "isMap",
      "isMapIterator",
      "isRegExp",
      "isSet",
      "isSetIterator",
      "isSharedArrayBuffer",
      "isTypedArray",
      "safeGetenv",
      "setHiddenValue"
    ]
  }

  const binding = { __proto__: null }

  for (const id of ids) {
    setDeferred(binding, id, () => {
      if (_binding === void 0) {
        _binding = getSilent(realProcess, "binding")
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

      const names = map[id]

      for (const name of names) {
        setGetter(object, name, () => {
          const value = getSilent(source, name)

          return typeof value === "function"
            ? (...args) => Reflect.apply(value, source, args)
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
