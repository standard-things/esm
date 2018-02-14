import getDescriptor from "../util/get-descriptor.js"
import setDescriptor from "../util/set-descriptor.js"
import setProperty from "../util/set-property.js"

function silent(callback) {
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
    result = callback()
  } catch (e) {}

  if (shouldRestore) {
    if (oldDescriptor) {
      setDescriptor(process, "noDeprecation", oldDescriptor)
    } else {
      delete process.noDeprecation
    }
  }

  return result
}

export default silent
