import getDescriptor from "../util/get-descriptor.js"
import setDescriptor from "../util/set-descriptor.js"
import setProperty from "../util/set-property.js"

function noDeprecationWarning(getter) {
  let descriptor
  let result

  const shouldRestore = ! process.noDeprecation

  if (shouldRestore) {
    descriptor = getDescriptor(process, "noDeprecation")

    if (descriptor) {
      setProperty(process, "noDeprecation", { value: true, writable: false })
    } else {
      process.noDeprecation = true
    }
  }

  try {
    result = getter()
  } catch (e) {}

  if (shouldRestore) {
    if (descriptor) {
      setDescriptor(process, "noDeprecation", descriptor)
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
