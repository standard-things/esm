import Entry from "./entry.js"
import ExportProxy from "./export-proxy.js"
import Module from "./module.js"
import OwnProxy from "./own/proxy.js"

import builtinModules from "./module/builtin-modules.js"
import copyProperty from "./util/copy-property.js"
import getProxyDetails from "./util/get-proxy-details.js"
import has from "./util/has.js"
import isOwnProxy from "./util/is-own-proxy.js"
import keysAll from "./util/keys-all.js"
import setDeferred from "./util/set-deferred.js"
import shared from "./shared.js"

const ExObject = __external__.Object

function init() {
  const builtinEntries = { __proto__: null }

  function createUtilExports(source) {
    const exported = new ExObject
    const names = keysAll(source)

    for (const name of names) {
      if (name !== "inspect") {
        copyProperty(exported, source, name)
      }
    }

    exported.inspect = new OwnProxy(source.inspect, {
      __proto__: null,
      apply(target, thisArg, args) {
        const [value] = args

        if (isOwnProxy(value)) {
          const details = getProxyDetails(value)

          if (details) {
            args[0] = details[0]
          }
        }

        return Reflect.apply(target, thisArg, args)
      }
    })

    return exported
  }

  function createVMExports(source) {
    const exported = new ExObject
    const names = keysAll(source)

    for (const name of names) {
      if (name !== "Module") {
        copyProperty(exported, source, name)
      }
    }

    return exported
  }

  for (const id of builtinModules) {
    setDeferred(builtinEntries, id, () => {
      const mod = new Module(id, null)
      const rawExports = __non_webpack_require__(id)
      let exported = rawExports

      if (id === "module") {
        exported = Module
      } else if (id === "util") {
        exported = createUtilExports(exported)
      } else if (id === "vm" &&
          has(rawExports, "Module")) {
        exported = createVMExports(exported)
      }

      const entry = Entry.get(mod)

      entry.rawExports = rawExports
      mod.exports = exported
      mod.loaded = true

      exported =
      mod.exports = new ExportProxy(entry)

      Entry.set(exported, entry)

      entry.builtin = true
      entry.loaded()
      return entry
    })
  }

  return builtinEntries
}

export default shared.inited
  ? shared.builtinEntries
  : shared.builtinEntries = init()
