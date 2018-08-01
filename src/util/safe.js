import GenericArray from "../generic/array.js"

import isDataDescriptor from "./is-data-descriptor.js"
import isObjectLike from "./is-object-like.js"
import keysAll from "./keys-all.js"
import shared from "../shared.js"

function init() {
  function safe(Super) {
    if (typeof Super !== "function") {
      if (Array.isArray(Super)) {
        return GenericArray.of(Super)
      }

      if (isObjectLike(Super)) {
        return copy({}, Super)
      }

      return Super
    }

    const Safe = isObjectLike(Super.prototype)
      ? class extends Super {}
      : (...args) => Reflect.construct(Super, args)

    const names = keysAll(Super)
    const safeProto = Safe.prototype

    for (const name of names) {
      if (name !== "prototype") {
        copyProperty(Safe, Super, name)
      }
    }

    copy(safeProto, Super.prototype)
    Reflect.setPrototypeOf(safeProto, null)

    return Safe
  }

  function copy(object, source) {
    const names = keysAll(source)

    for (const name of names) {
      copyProperty(object, source, name)
    }

    return object
  }

  function copyProperty(object, source, name) {
    const descriptor = Reflect.getOwnPropertyDescriptor(source, name)

    if (descriptor) {
      if (Reflect.has(descriptor, "value")) {
        const { value } = descriptor

        if (Array.isArray(value)) {
          descriptor.value = Array.from(value)
        }
      }

      if (isDataDescriptor(descriptor)) {
        object[name] = descriptor.value
      } else {
        descriptor.configurable = true

        if (Reflect.has(descriptor, "writable")) {
          descriptor.writable = true
        }

        Reflect.defineProperty(object, name, descriptor)
      }
    }

    return object
  }

  return safe
}

export default shared.inited
  ? shared.module.utilSafe
  : shared.module.utilSafe = init()
