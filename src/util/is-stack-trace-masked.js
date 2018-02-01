import getDescriptor from "../util/get-descriptor.js"
import isError from "./is-error.js"

const { toString } = Function.prototype

const nativePattern = "[native code]"

function isStackTraceMasked(error) {
  if (! isError(error)) {
    return false
  }

  const descriptor = getDescriptor(error, "stack")

  return !! descriptor &&
    descriptor.configurable === true &&
    descriptor.enumerable === false &&
    typeof descriptor.get === "function" &&
    typeof descriptor.set === "function" &&
    toString.call(descriptor.get).indexOf(nativePattern) === -1 &&
    toString.call(descriptor.set).indexOf(nativePattern) === -1
}

export default isStackTraceMasked
