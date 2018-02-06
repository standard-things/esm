import getDescriptor from "../util/get-descriptor.js"
import setDescriptor from "../util/set-descriptor.js"
import setProperty from "../util/set-property.js"

function noDeprecationWarning(getter) {
  let oldDescriptor

  const shouldRestore = ! process.noDeprecation

  if (shouldRestore) {
    oldDescriptor = getDescriptor(process, "noDeprecation")

    if (oldDescriptor) {
      setProperty(process, "noDeprecation", { value: true, writable: false })
    } else {
      process.noDeprecation = true
    }
  }

  let result

  try {
    result = getter()
  } catch (e) {}

  if (shouldRestore) {
    if (oldDescriptor) {
      setDescriptor(process, "noDeprecation", oldDescriptor)
    } else {
      delete process.noDeprecation
    }
  }

  if (typeof result !== "function") {
    return result
  }

  return function (...args) {
    return noDeprecationWarning(() => result.apply(this, args))
  }
}

export default noDeprecationWarning
