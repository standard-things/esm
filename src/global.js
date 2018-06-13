import OwnProxy from "./own/proxy.js"

import builtinEntries from "./builtin-entries.js"
import isUpdatableDescriptor from "./util/is-updatable-descriptor.js"
import shared from "./shared.js"

function init() {
  const getConsole = () => builtinEntries.console.module.exports

  const handler = {
    get(target, name, receiver) {
      return name === "console"
        ? getConsole()
        : Reflect.get(target, name, receiver)
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
          Reflect.deleteProperty(target, "get")
          Reflect.deleteProperty(target, "getOwnPropertyDescriptor")
          Reflect.deleteProperty(target, "set")
        }

        return true
      }

      return false
    }
  }

  return new OwnProxy(shared.unsafeContext, handler)
}

export default shared.inited
  ? shared.module.global
  : shared.module.global = init()
