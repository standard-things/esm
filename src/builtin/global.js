import OwnProxy from "../own/proxy.js"

import builtinEntries from "../builtin-entries.js"
import builtinReflect from "./reflect.js"
import isUpdatableDescriptor from "../util/is-updatable-descriptor.js"
import isUpdatableGet from "../util/is-updatable-get.js"
import shared from "../shared.js"

function init() {
  const builtinMap = {
    Reflect: builtinReflect,
    get console() {
      return builtinEntries.console.module.exports
    }
  }

  const externalMap = new Map([
    ["Reflect", shared.external.Reflect],
    ["console", console]
  ])

  const proxy = new OwnProxy(shared.unsafeGlobal, {
    get(unsafeGlobal, name, receiver) {
      if (receiver === proxy) {
        receiver = unsafeGlobal
      }

      const value = Reflect.get(unsafeGlobal, name, receiver)

      if (externalMap.has(name)) {
        const newValue = builtinMap[name]

        if (newValue !== value &&
            value === externalMap.get(name) &&
            isUpdatableGet(unsafeGlobal, name)) {
          return newValue
        }
      }

      return value
    },
    getOwnPropertyDescriptor(unsafeGlobal, name) {
      const descriptor = Reflect.getOwnPropertyDescriptor(unsafeGlobal, name)

      if (externalMap.has(name) &&
          descriptor !== void 0 &&
          descriptor.value === externalMap.get(name) &&
          isUpdatableDescriptor(descriptor)) {
        descriptor.value = builtinMap[name]
      }

      return descriptor
    }
  })

  return proxy
}

export default shared.inited
  ? shared.module.builtinGlobal
  : shared.module.builtinGlobal = init()
