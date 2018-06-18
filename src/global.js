import OwnProxy from "./own/proxy.js"

import builtinEntries from "./builtin-entries.js"
import has from "./util/has.js"
import isUpdatableDescriptor from "./util/is-updatable-descriptor.js"
import shared from "./shared.js"

function init() {
  const getConsole = () => builtinEntries.console.module.exports

  const handler = {
    get(target, name, receiver) {
      if (receiver === proxy) {
        receiver = target
      }

      const value = Reflect.get(target, name, receiver)

      if (name === "console") {
        const newValue = getConsole()

        if (newValue !== value &&
            (! has(target, name) ||
             isUpdatableDescriptor(Reflect.getOwnPropertyDescriptor(target, name)))) {
          return newValue
        }
      }

      return value
    },
    getOwnPropertyDescriptor(target, name) {
      const descriptor = Reflect.getOwnPropertyDescriptor(target, name)

      if (name === "console" &&
          isUpdatableDescriptor(descriptor)) {
        descriptor.value = getConsole()
      }

      return descriptor
    },
    set(target, name, value, receiver) {
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

  const proxy = new OwnProxy(shared.unsafeContext, handler)

  return proxy
}

export default shared.inited
  ? shared.module.global
  : shared.module.global = init()
