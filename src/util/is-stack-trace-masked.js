
import isNative from "./is-native.js"
import isObjectLike from "./is-object-like.js"

function isStackTraceMasked(error) {
  if (! isObjectLike(error)) {
    return false
  }

  const descriptor = Reflect.getOwnPropertyDescriptor(error, "stack")

  return descriptor &&
    descriptor.configurable &&
    descriptor.get &&
    descriptor.set &&
    ! descriptor.enumerable &&
    ! isNative(descriptor.get) &&
    ! isNative(descriptor.set)
}

export default isStackTraceMasked
