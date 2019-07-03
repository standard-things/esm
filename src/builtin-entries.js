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

const FuncHasInstance = Function.prototype[Symbol.hasInstance]

function createEntry(id) {
  const mod = builtinModules[id]

  let exported = mod.exports
  let unwrapped = exported

  const isFunc = typeof unwrapped === "function"

  if (isFunc &&
      id !== "assert") {
    const func = unwrapped
    const { prototype } = func

    const hasInstance = maskFunction(
      function (instance) {
        if ((this === exported ||
             this === proxyFunc) &&
            instance instanceof func) {
          return true
        }

        return instanceOf(instance, this)
      },
      FuncHasInstance
    )

    const proxyFunc = new OwnProxy(func, {
      get(func, name, receiver) {
        if (receiver === exported ||
            receiver === proxyFunc) {
          receiver = func
        }

        const value = Reflect.get(func, name, receiver)

        let newValue = value

        if (name === Symbol.hasInstance) {
          newValue = hasInstance
        } else if (value === func) {
          newValue = exported
        } else if (value === prototype) {
          newValue = proxyProto
        }

        if (newValue !== value &&
            isUpdatableGet(func, name)) {
          return newValue
        }

        return value
      },
      getOwnPropertyDescriptor(func, name) {
        const descriptor = Reflect.getOwnPropertyDescriptor(func, name)

        if (descriptor !== void 0 &&
            descriptor.value === prototype &&
            isUpdatableDescriptor(descriptor)) {
          descriptor.value = proxyProto
        }

        return descriptor
      }
    })

    const proxyProto = new OwnProxy(prototype, {
      get(prototype, name, receiver) {
        if (receiver === proxyProto) {
          receiver = prototype
        }

        const value = Reflect.get(prototype, name, receiver)

        if (value === func &&
            isUpdatableGet(prototype, name)) {
          return exported
        }

        return value
      },
      getOwnPropertyDescriptor(prototype, name) {
        const descriptor = Reflect.getOwnPropertyDescriptor(prototype, name)

        if (descriptor !== void 0 &&
            descriptor.value === func &&
            isUpdatableDescriptor(descriptor)) {
          descriptor.value = exported
        }

        return descriptor
      }
    })

    mod.exports = proxyFunc
  }

  const entry = Entry.get(mod)

  entry.builtin = true

  exported = proxyExports(entry)

  mod.exports = exported
  entry.exports = exported

  if (isFunc &&
      id === "module") {
    unwrapped.prototype.constructor = exported
  }

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

    if (id !== "console" &&
        id !== "module" &&
        id !== "util") {
      cache.set(id, entry)
    }

    return entry
  })
}

export default builtinEntries
