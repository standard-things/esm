import has from "./has.js"
import isDataPropertyDescriptor from "./is-data-property-descriptor.js"
import isObjectLike from "./is-object-like.js"
import shared from "../shared.js"

function init() {
  function safeCopyProperty(object, source, name) {
    if (! isObjectLike(object) ||
        ! isObjectLike(source)) {
      return object
    }

    const descriptor = Reflect.getOwnPropertyDescriptor(source, name)

    if (descriptor !== void 0) {
      if (has(descriptor, "value")) {
        const { value } = descriptor

        if (Array.isArray(value)) {
          descriptor.value = Array.from(value)
        }
      }

      if (isDataPropertyDescriptor(descriptor)) {
        object[name] = descriptor.value
      } else {
        descriptor.configurable = true

        if (has(descriptor, "writable")) {
          descriptor.writable = true
        }

        Reflect.defineProperty(object, name, descriptor)
      }
    }

    return object
  }

  return safeCopyProperty
}

export default shared.inited
  ? shared.module.utilSafeCopyProperty
  : shared.module.utilSafeCopyProperty = init()
