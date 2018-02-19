
import getDescriptor from "../util/get-descriptor.js"
import isNative from "../util/is-native.js"

function isStackTraceMasked(error) {
  const descriptor = getDescriptor(error, "stack")

  return !! descriptor &&
    descriptor.configurable === true &&
    descriptor.enumerable === false &&
    typeof descriptor.get === "function" &&
    typeof descriptor.set === "function" &&
    ! isNative(descriptor.get) &&
    ! isNative(descriptor.set)
}

export default isStackTraceMasked
