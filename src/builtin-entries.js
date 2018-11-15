import ENV from "./constant/env.js"

import Entry from "./entry.js"
import OwnProxy from "./own/proxy.js"

import builtinIds from "./builtin-ids.js"
import builtinModules from "./builtin-modules.js"
import instanceOf from "./util/instance-of.js"
import isUpdatableDescriptor from "./util/is-updatable-descriptor.js"
import isUpdatableGet from "./util/is-updatable-get.js"
import maskFunction from "./util/mask-function.js"
import proxyExports from "./util/proxy-exports.js"
import setDeferred from "./util/set-deferred.js"
import shared from "./shared.js"

const {
  CHAKRA
} = ENV

const funcHasInstance = Function.prototype[Symbol.hasInstance]

function createEntry(id) {
  const mod = builtinModules[id]

  let exported = mod.exports

  if (! CHAKRA &&
      id !== "assert" &&
      typeof exported === "function") {
    const func = exported
    const { prototype } = func

    const hasInstance = maskFunction(
      function (instance) {
        if (this === exported) {
          return instance instanceof func ||
            instanceOf(instance, exported)
        }

        return instanceOf(instance, this)
      },
      funcHasInstance
    )

    const proxyFunc = new OwnProxy(func, {
      get(target, name, receiver) {
        if (receiver === exported ||
            receiver === proxyFunc) {
          receiver = target
        }

        const value = Reflect.get(target, name, receiver)

        let newValue = value

        if (name === Symbol.hasInstance) {
          newValue = hasInstance
        } else if (value === func) {
          newValue = exported
        } else if (value === prototype) {
          newValue = proxyProto
        }

        if (newValue !== value &&
            isUpdatableGet(target, name)) {
          return newValue
        }

        return value
      },
      getOwnPropertyDescriptor(target, name){
        const descriptor = Reflect.getOwnPropertyDescriptor(target, name)

        if (descriptor &&
            descriptor.value === prototype &&
            isUpdatableDescriptor(descriptor)) {
          descriptor.value = proxyProto
        }

        return descriptor
      }
    })

    const proxyProto = new OwnProxy(prototype, {
      get(target, name, receiver) {
        if (receiver === proxyProto) {
          receiver = target
        }

        const value = Reflect.get(target, name, receiver)

        if (value === func &&
            isUpdatableGet(target, name)) {
          return exported
        }

        return value
      },
      getOwnPropertyDescriptor(target, name){
        const descriptor = Reflect.getOwnPropertyDescriptor(target, name)

        if (descriptor !== void 0) {
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
  setDeferred(builtinEntries, id, () => {
    const cached = cache.get(id)

    if (cached !== void 0) {
      return cached
    }

    const entry = createEntry(id)

    if (id !== "module") {
      cache.set(id, entry)
    }

    return entry
  })
}

export default builtinEntries
