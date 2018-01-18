import isError from "./is-error.js"

const { getOwnPropertyDescriptor } = Object

function isStackTraceMasked(error) {
  if (! isError(error)) {
    return false
  }

  const descriptor = getOwnPropertyDescriptor(error, "stack")

  return !! descriptor &&
    descriptor.configurable === true &&
    descriptor.enumerable === false &&
    typeof descriptor.get === "function" &&
    typeof descriptor.set === "function"
}

export default isStackTraceMasked
