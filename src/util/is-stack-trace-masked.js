import GenericFunction from "../generic/function.js"

import getDescriptor from "../util/get-descriptor.js"

const nativePattern = "[native code]"

function isStackTraceMasked(error) {
  const descriptor = getDescriptor(error, "stack")

  return !! descriptor &&
    descriptor.configurable === true &&
    descriptor.enumerable === false &&
    typeof descriptor.get === "function" &&
    typeof descriptor.set === "function" &&
    GenericFunction.toString(descriptor.get).indexOf(nativePattern) === -1 &&
    GenericFunction.toString(descriptor.set).indexOf(nativePattern) === -1
}

export default isStackTraceMasked
