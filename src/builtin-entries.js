import Entry from "./entry.js"
import ExportProxy from "./export-proxy.js"
import Module from "./module.js"
import OwnProxy from "./own/proxy.js"

import builtinModules from "./module/builtin-modules.js"
import copyProperty from "./util/copy-property.js"
import has from "./util/has.js"
import keysAll from "./util/keys-all.js"
import setDeferred from "./util/set-deferred.js"
import shared from "./shared.js"
import unwrapProxy from "./util/unwrap-proxy.js"

const ExObject = __external__.Object

const customInspectDescriptor = {
  __proto__: null,
  configurable: true,
  value: true,
  writable: true
}

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
      apply(target, thisArg, args) {
        args[0] = unwrapProxy(args[0])
        return Reflect.apply(target, thisArg, args)
      }
    })

    Reflect.defineProperty(exported, shared.symbol.inspect, customInspectDescriptor)

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
      let exported = unwrapProxy(__non_webpack_require__(id))

      if (id === "module") {
        exported = Module
      } else if (id === "util") {
        exported = createUtilExports(exported)
      } else if (id === "vm" &&
          has(exported, "Module")) {
        exported = createVMExports(exported)
      }

      const mod = new Module(id, null)
      const entry = Entry.get(mod)

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
