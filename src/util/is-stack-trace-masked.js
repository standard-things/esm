import GenericFunction from "../generic/function.js"
import GenericString from "../generic/string.js"

import getDescriptor from "../util/get-descriptor.js"

const nativePattern = "[native code]"

function isStackTraceMasked(error) {
  const descriptor = getDescriptor(error, "stack")

  return !! descriptor &&
    descriptor.configurable === true &&
    descriptor.enumerable === false &&
    typeof descriptor.get === "function" &&
    typeof descriptor.set === "function" &&
    GenericString.indexOf(GenericFunction.toString(descriptor.get), nativePattern) === -1 &&
    GenericString.indexOf(GenericFunction.toString(descriptor.set), nativePattern) === -1
}

export default isStackTraceMasked
