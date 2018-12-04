import isError from "./is-error.js"
import isNative from "./is-native.js"
import shared from "../shared.js"

function init() {
  function isStackTraceMasked(error) {
    const descriptor = isError(error)
      ? Reflect.getOwnPropertyDescriptor(error, "stack")
      : void 0

    if (descriptor !== void 0 &&
        descriptor.configurable === true &&
        descriptor.enumerable === false &&
        typeof descriptor.get === "function" &&
        typeof descriptor.set === "function" &&
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
