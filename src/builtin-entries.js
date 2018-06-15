import Entry from "./entry.js"
import OwnProxy from "./own/proxy.js"

import builtinIds from "./builtin-ids.js"
import builtinModules from "./builtin-modules.js"
import isObjectLike from "./util/is-object-like.js"
import isUpdatableDescriptor from "./util/is-updatable-descriptor.js"
import maskFunction from "./util/mask-function.js"
import proxyExports from "./util/proxy-exports.js"
import setDeferred from "./util/set-deferred.js"
import shared from "./shared.js"

const funcHasInstance = Function.prototype[Symbol.hasInstance]

function createEntry(id) {
  const mod = builtinModules[id]

  let exported = mod.exports

  if (id !== "assert" &&
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

    const proxyFunc = new OwnProxy(func, {
      get(target, name, receiver) {
        if (name === Symbol.hasInstance) {
          return hasInstance
        }

        if (receiver === proxyFunc) {
          receiver = target
        }

        const value = Reflect.get(target, name, receiver)

        return value === proto ? proxyProto : value
      },
      getOwnPropertyDescriptor(target, name){
        const descriptor = Reflect.getOwnPropertyDescriptor(target, name)

        if (descriptor &&
            descriptor.value === proto &&
            isUpdatableDescriptor(descriptor)) {
          descriptor.value = proxyProto
        }

        return descriptor
      }
    })

    const proxyProto = new OwnProxy(proto, {
      get(target, name, receiver) {
        if (receiver === proxyProto) {
          receiver = target
        }

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

    mod.exports = proxyFunc
  }

  const entry = Entry.get(mod)

  entry.builtin = true

  exported =
  entry.exports =
  mod.exports = proxyExports(entry)

  entry.loaded()
  return entry
}

const builtinEntries = { __proto__: null }
const cache = shared.memoize.builtinEntries

for (const id of builtinIds) {
  if (Reflect.has(cache, id)) {
    builtinEntries[id] = cache[id]
  } else {
    setDeferred(builtinEntries, id, () => {
      const entry = createEntry(id)

      if (id !== "module") {
        cache[id] = entry
      }

      return entry
    })
  }
}

export default builtinEntries
