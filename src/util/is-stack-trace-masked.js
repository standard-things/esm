import isError from "./is-error.js"
import isNative from "./is-native.js"
import shared from "../shared.js"

function init() {
  function isStackTraceMasked(error) {
    const descriptor = isError(error)
      ? Reflect.getOwnPropertyDescriptor(error, "stack")
      : void 0

    if (descriptor &&
        descriptor.configurable &&
        typeof descriptor.get === "function" &&
        typeof descriptor.set === "function" &&
        ! descriptor.enumerable &&
        ! isNative(descriptor.get) &&
        ! isNative(descriptor.set)) {
      return true
    }

    return false
  }

  return isStackTraceMasked
}

export default shared.inited
  ? shared.module.utilIsStackTraceMasked
  : shared.module.utilIsStackTraceMasked = init()
