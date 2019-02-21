import OwnProxy from "../own/proxy.js"

import builtinEntries from "../builtin-entries.js"
import builtinReflect from "./reflect.js"
import isUpdatableDescriptor from "../util/is-updatable-descriptor.js"
import isUpdatableGet from "../util/is-updatable-get.js"
import shared from "../shared.js"

function init() {
  const globalsLookup = new Set([
    "Reflect",
    "console"
  ])

  const globalsMap = {
    Reflect: builtinReflect,
    get console() {
      return builtinEntries.console.module.exports
    }
  }

  const handler = {
    get(unsafeGlobal, name, receiver) {
      if (receiver === proxy) {
        receiver = unsafeGlobal
      }

      const value = Reflect.get(unsafeGlobal, name, receiver)

      if (globalsLookup.has(name)) {
        const newValue = globalsMap[name]

        if (newValue !== value &&
            isUpdatableGet(unsafeGlobal, name)) {
          return newValue
        }
      }

      return value
    },
    getOwnPropertyDescriptor(unsafeGlobal, name) {
      const descriptor = Reflect.getOwnPropertyDescriptor(unsafeGlobal, name)

      if (globalsLookup.has(name) &&
          isUpdatableDescriptor(descriptor)) {
        descriptor.value = globalsMap[name]
      }

      return descriptor
    },
    set(unsafeGlobal, name, value, receiver) {
      if (receiver === proxy) {
        receiver = unsafeGlobal
      }

      if (Reflect.set(unsafeGlobal, name, value, receiver)) {
        if (globalsLookup.has(name)) {
          globalsLookup.delete(name)

          if (globalsLookup.size === 0) {
            Reflect.deleteProperty(handler, "get")
            Reflect.deleteProperty(handler, "getOwnPropertyDescriptor")
            Reflect.deleteProperty(handler, "set")
          }
        }

        return true
      }

      return false
    }
  }

  const proxy = new OwnProxy(shared.unsafeGlobal, handler)

  return proxy
}

export default shared.inited
  ? shared.module.builtinGlobal
  : shared.module.builtinGlobal = init()
