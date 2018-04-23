
import isNative from "./is-native.js"
import isObjectLike from "./is-object-like.js"

function isStackTraceMasked(error) {
  if (! isObjectLike(error)) {
    return false
  }

  const descriptor = Reflect.getOwnPropertyDescriptor(error, "stack")

  return descriptor !== void 0 &&
    descriptor.configurable === true &&
    descriptor.enumerable === false &&
    typeof descriptor.get === "function" &&
    typeof descriptor.set === "function" &&
    ! isNative(descriptor.get) &&
    ! isNative(descriptor.set)
}

export default isStackTraceMasked
