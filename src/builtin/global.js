import OwnProxy from "../own/proxy.js"

import builtinEntries from "../builtin-entries.js"
import isUpdatableDescriptor from "../util/is-updatable-descriptor.js"
import isUpdatableGet from "../util/is-updatable-get.js"
import shared from "../shared.js"

function init() {
  const handler = {
    get(target, name, receiver) {
      if (receiver === proxy) {
        receiver = target
      }

      const value = Reflect.get(target, name, receiver)

      if (name === "console") {
        const newValue = builtinEntries.console.module.exports

        if (newValue !== value &&
            isUpdatableGet(target, name)) {
          return newValue
        }
      }

      return value
    },
    getOwnPropertyDescriptor(target, name) {
      const descriptor = Reflect.getOwnPropertyDescriptor(target, name)

      if (name === "console" &&
          isUpdatableDescriptor(descriptor)) {
        descriptor.value = builtinEntries.console.module.exports
      }

      return descriptor
    },
    set(target, name, value, receiver) {
      if (receiver === proxy) {
        receiver = target
      }

      if (Reflect.set(target, name, value, receiver)) {
        if (name === "console") {
          Reflect.deleteProperty(handler, "get")
          Reflect.deleteProperty(handler, "getOwnPropertyDescriptor")
          Reflect.deleteProperty(handler, "set")
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
