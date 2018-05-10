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
import realRequire from "./real/require.js"
import setDeferred from "./util/set-deferred.js"
import shared from "./shared.js"
import toNamespaceObject from "./util/to-namespace-object.js"
import unwrapProxy from "./util/unwrap-proxy.js"

function init() {
  const ExObject = shared.external.Object

  const baseHasInstance = shared.external.Function.prototype[Symbol.hasInstance]
  const builtinEntries = { __proto__: null }

  function createUtilExports(source) {
    const exported = new ExObject
    const names = keysAll(source)

    for (const name of names) {
      if (name !== "inspect" &&
          name !== "types") {
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

    const sourceTypes = source.types

    if (sourceTypes) {
      const names = keysAll(sourceTypes)
      const types = new ExObject

      for (const name of names) {
        if (name !== "isProxy") {
          copyProperty(types, sourceTypes, name)
        }
      }

      types.isProxy = new OwnProxy(sourceTypes.isProxy, {
        apply(target, thisArg, args) {
          return ! isOwnProxy(args[0]) &&
            Reflect.apply(target, thisArg, args)
        }
      })

      exported.types = types
    }

    const { customInspectKey } = shared

    // Defining a truthy, but non-function value, for `customInspectKey` will
    // inform builtin `inspect()` to bypass the deprecation warning for the
    // custom `util.inspect()` function when inspecting `util`.
    if (! has(exported, customInspectKey)) {
      Reflect.defineProperty(exported, customInspectKey, {
        __proto__: null,
        configurable: true,
        value: true,
        writable: true
      })
    }

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
      } else if (typeof exported === "function") {
        const func = exported
        const proto = func.prototype
        const hasInstance = (value) => value instanceof func

        const proxyProto = new OwnProxy(proto, {
          get(target, name, receiver) {
            const value = Reflect.get(target, name, receiver)

            return value === func ? exported : value
          },
          getOwnPropertyDescriptor(target, name){
            const descriptor = Reflect.getOwnPropertyDescriptor(target, name)

            if (has(descriptor, "value")) {
              const { value } = descriptor

              if (value === func) {
                descriptor.value = exported
              }
            }

            return descriptor
          }
        })

        const proxyFunc = new OwnProxy(func, {
          get(target, name, receiver) {
            const value = Reflect.get(target, name, receiver)

            if (name === Symbol.hasInstance &&
               (typeof value !== "function" ||
                value === baseHasInstance)) {
              return hasInstance
            }

            return value === proto ? proxyProto : value
          },
          getOwnPropertyDescriptor(target, name){
            const descriptor = Reflect.getOwnPropertyDescriptor(target, name)

            if (has(descriptor, "value")) {
              const { value } = descriptor

              if (value === proto) {
                descriptor.value = proxyProto
              }
            }

            return descriptor
          }
        })

        exported = proxyFunc
      }

      const mod = new Module(id, null)
      const entry = Entry.get(mod)

      mod.exports = exported
      mod.loaded = true

      exported =
      mod.exports = proxyExports(entry)

      Entry.set(exported, entry)

      entry.builtin = true
      entry.id = id
      entry.loaded()
      return entry
    })
  }

  return builtinEntries
}

export default shared.inited
  ? shared.module.builtinEntries
  : shared.module.builtinEntries = init()
