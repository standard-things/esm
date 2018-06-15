import OwnProxy from "./own/proxy.js"

import builtinEntries from "./builtin-entries.js"
import isUpdatableDescriptor from "./util/is-updatable-descriptor.js"
import shared from "./shared.js"

function init() {
  const getConsole = () => builtinEntries.console.module.exports

  const handler = {
    get(target, name, receiver) {
      if (name === "console") {
        return getConsole()
      }

      if (receiver === proxy) {
        receiver = target
      }

      return Reflect.get(target, name, receiver)
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
