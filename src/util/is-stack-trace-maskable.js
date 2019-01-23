import isError from "./is-error.js"
import isNative from "./is-native.js"
import shared from "../shared.js"

function init() {
  function isStackTraceMaskable(error) {
    if (! isError(error)) {
      return false
    }

    const descriptor = Reflect.getOwnPropertyDescriptor(error, "stack")

    if (descriptor !== void 0 &&
        descriptor.configurable === true &&
        descriptor.enumerable === false &&
        typeof descriptor.get === "function" &&
        typeof descriptor.set === "function" &&
        ! isNative(descriptor.get) &&
        ! isNative(descriptor.set)) {
      return false
    }

    return true
  }

  return isStackTraceMaskable
}

export default shared.inited
  ? shared.module.utilIsStackTraceMaskable
  : shared.module.utilIsStackTraceMaskable = init()
