import Entry from "./entry.js"
import Module from "./module.js"
import OwnProxy from "./own/proxy.js"

import builtinModules from "./module/builtin-modules.js"
import copyProperty from "./util/copy-property.js"
import has from "./util/has.js"
import isNamespaceObject from "./util/is-namespace-object.js"
import isObjectLike from "./util/is-object-like.js"
import isOwnProxy from "./util/is-own-proxy.js"
import keysAll from "./util/keys-all.js"
import maskFunction from "./util/mask-function.js"
import proxyExports from "./util/proxy-exports.js"
import realRequire from "./real/require.js"
import setDeferred from "./util/set-deferred.js"
import shared from "./shared.js"
import toNamespaceObject from "./util/to-namespace-object.js"
import unwrapProxy from "./util/unwrap-proxy.js"

const ExObject = shared.external.Object

const funcHasInstance = Function.prototype[Symbol.hasInstance]

function createEntry(id) {
  let exported = unwrapProxy(realRequire(id))

  if (id === "module") {
    exported = Module
  } else if (id === "util") {
    exported = createUtilExports(exported)
  } else if (id === "vm" &&
      has(exported, "Module")) {
    exported = createVMExports(exported)
  } else if (id !== "assert" &&
      typeof exported === "function" &&
      shared.support.proxiedClasses) {
    const func = exported
    const proto = func.prototype

    const hasInstance = maskFunction(
      (value) => {
        if (value instanceof func) {
          return true
        }

        if (isObjectLike(value)) {
          let proto = value

          while ((proto = Reflect.getPrototypeOf(proto))) {
            if (proto === proxyProto) {
              return true
            }
          }
        }

        return false
      },
      funcHasInstance
    )

    const proxyProto = new OwnProxy(proto, {
      get(target, name, receiver) {
        const value = Reflect.get(target, name, receiver)

        return value === func ? exported : value
      },
      getOwnPropertyDescriptor(target, name){
        const descriptor = Reflect.getOwnPropertyDescriptor(target, name)

        if (descriptor) {
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
        if (name === Symbol.hasInstance) {
          return hasInstance
        }

        const value = Reflect.get(target, name, receiver)

        return value === proto ? proxyProto : value
      },
      getOwnPropertyDescriptor(target, name){
        const descriptor = Reflect.getOwnPropertyDescriptor(target, name)

        if (descriptor) {
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

  mod.exports = exported
  mod.loaded = true

  const entry = Entry.get(mod)

  entry.builtin = true

  exported =
  entry.exports =
  mod.exports = proxyExports(entry)

  entry.loaded()
  return entry
}

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
      if (name !== "isModuleNamespaceObject" &&
          name !== "isProxy") {
        copyProperty(types, sourceTypes, name)
      }
    }

    types.isModuleNamespaceObject = new OwnProxy(sourceTypes.isModuleNamespaceObject, {
      apply(target, thisArg, args) {
        const [value] = args

        return isOwnProxy(value) &&
          Reflect.has(value, shared.symbol.namespace)
      }
    })

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

const builtinEntries = { __proto__: null }
const cache = shared.memoize.builtinEntries

for (const id of builtinModules) {
  if (Reflect.has(cache, id)) {
    builtinEntries[id] = cache[id]
  } else {
    setDeferred(builtinEntries, id, () => {
      const entry = createEntry(id)

      if (id === "module") {
        cache[id] = entry
      }

      return entry
    })
  }
}

export default builtinEntries
