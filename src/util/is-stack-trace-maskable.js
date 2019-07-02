import isError from "./is-error.js"
import isNativeFunction from "./is-native-function.js"
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
        ! isNativeFunction(descriptor.get) &&
        ! isNativeFunction(descriptor.set)) {
      return false
    }

    return true
  }

  return isStackTraceMaskable
}

export default shared.inited
  ? shared.module.utilIsStackTraceMaskable
  : shared.module.utilIsStackTraceMaskable = init()
