import Entry from "./entry.js"
import Module from "./module.js"
import OwnProxy from "./own/proxy.js"

import builtinModules from "./module/builtin-modules.js"
import copyProperty from "./util/copy-property.js"
import has from "./util/has.js"
import isNamespaceObject from "./util/is-namespace-object.js"
import isOwnProxy from "./util/is-own-proxy.js"
import keysAll from "./util/keys-all.js"
import proxyExports from "./util/proxy-exports.js"
import realRequire from "./real-require.js"
import setDeferred from "./util/set-deferred.js"
import shared from "./shared.js"
import toNamespaceObject from "./util/to-namespace-object.js"
import unwrapProxy from "./util/unwrap-proxy.js"

function init() {
  const ExObject = __external__.Object

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
        const [value] = args

        if (isOwnProxy(value)) {
          args[0] = isNamespaceObject(value)
            ? toNamespaceObject(value)
            : unwrapProxy(value)
        }

        return Reflect.apply(target, thisArg, args)
      }
    })

    // Defining a truthy, but non-function value, for `customInspectSymbol`
    // will inform builtin `inspect()` to bypass the deprecation warning for
    // the custom `util.inspect()` function when inspecting `util`.
    Reflect.defineProperty(exported, shared.customInspectKey, {
      __proto__: null,
      configurable: true,
      value: true,
      writable: true
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
      let exported = unwrapProxy(realRequire(id))

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
      const oldExported = exported

      mod.exports = oldExported
      mod.loaded = true

      exported =
      mod.exports = proxyExports(entry)

      if (typeof oldExported === "function") {
        const oldProto = oldExported.prototype

        if (has(oldProto, "constructor") &&
            oldProto.constructor === oldExported) {
          oldExported.prototype.constructor = exported
        }
      }

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
