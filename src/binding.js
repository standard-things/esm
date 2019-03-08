import GenericFunction from "./generic/function.js"

import getSilent from "./util/get-silent.js"
import isObjectLike from "./util/is-object-like.js"
import keys from "./util/keys.js"
import safeProcess from "./safe/process.js"
import setDeferred from "./util/set-deferred.js"
import shared from "./shared.js"
import silent from "./util/silent.js"

function init() {
  const ids = [
    "fs",
    "inspector",
    "natives",
    "util"
  ]

  const map = new Map([
    ["fs", [
      // Used for faster directory, file, and existence checks.
      "internalModuleStat",
      // Used for native `realpath()` calls in Node < 9.2.0.
      "realpath"
    ]],
    ["inspector", [
      // Used to combine `esm` and global `console` methods without adding to
      // the call stack.
      "consoleCall"
    ]],
    ["natives",
      // Use to define `Module.builtinModules` in Node < 9.3.0.
      void 0
    ],
    ["util", [
      // Used as the stack trace decoration indicator in Node 7+.
      "decorated_private_symbol",
      // Used to get the unwrapped object and proxy handler.
      "getProxyDetails",
      // Used for more secure environment variable retrieval in Node 10+.
      "safeGetenv",
      // Used to decorate stack traces until
      // https://github.com/nodejs/node/pull/23926 is merged.
      "setHiddenValue"
    ]]
  ])

  const binding = {}

  for (const id of ids) {
    setDeferred(binding, id, () => {
      const object = {}
      const source = safeProcess.binding(id)

      if (! isObjectLike(source)) {
        return object
      }

      let names = map.get(id)

      if (names === void 0) {
        names = keys(source)
      }

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
