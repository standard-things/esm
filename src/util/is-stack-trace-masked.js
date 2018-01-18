import isStackTraceDecorated from "./is-stack-trace-decorated.js"

const { getOwnPropertyDescriptor } = Object

function isStackTraceMasked(error) {
  if (! isStackTraceDecorated(error)) {
    return false
  }

  const descriptor = getOwnPropertyDescriptor(error, "stack")

  if (! descriptor ||
      ! ("get" in descriptor) ||
      ! ("set" in descriptor)) {
    return false
  }

  return true
}

export default isStackTraceMasked
