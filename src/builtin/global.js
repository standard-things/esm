import OwnProxy from "../own/proxy.js"

import builtinEntries from "../builtin-entries.js"
import builtinReflect from "./reflect.js"
import isObjectEmpty from "../util/is-object-empty.js"
import isUpdatableDescriptor from "../util/is-updatable-descriptor.js"
import isUpdatableGet from "../util/is-updatable-get.js"
import shared from "../shared.js"

function init() {
  const globals = {
    __proto__: null,
    Reflect: builtinReflect,
    get console() {
      return builtinEntries.console.module.exports
    }
  }

  const handler = {
    get(target, name, receiver) {
      if (receiver === proxy) {
        receiver = target
      }

      const value = Reflect.get(target, name, receiver)

      if (Reflect.has(globals, name)) {
        const newValue = globals[name]

        if (newValue !== value &&
            isUpdatableGet(target, name)) {
          return newValue
        }
      }

      return value
    },
    getOwnPropertyDescriptor(target, name) {
      const descriptor = Reflect.getOwnPropertyDescriptor(target, name)

      if (Reflect.has(globals, name) &&
          isUpdatableDescriptor(descriptor)) {
        descriptor.value = globals[name]
      }

      return descriptor
    },
    set(target, name, value, receiver) {
      if (receiver === proxy) {
        receiver = target
      }

      if (Reflect.set(target, name, value, receiver)) {
        if (Reflect.has(globals, name)) {
          Reflect.deleteProperty(globals, name)

          if (isObjectEmpty(globals)) {
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
