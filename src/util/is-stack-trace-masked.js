import isError from "./is-error.js"

const { getOwnPropertyDescriptor } = Object
const { toString } = Function.prototype

const nativeCodeRegExp = /\[native code\]/

function isStackTraceMasked(error) {
  if (! isError(error)) {
    return false
  }

  const descriptor = getOwnPropertyDescriptor(error, "stack")

  return !! descriptor &&
    descriptor.configurable === true &&
    descriptor.enumerable === false &&
    typeof descriptor.get === "function" &&
    typeof descriptor.set === "function" &&
    ! nativeCodeRegExp.test(toString.call(descriptor.get)) &&
    ! nativeCodeRegExp.test(toString.call(descriptor.set))
}

export default isStackTraceMasked
