import setProperty from "../util/set-property.js"

const { defineProperty, getOwnPropertyDescriptor } = Object

function noDeprecationWarning(getter) {
  let descriptor
  let result

  const shouldRestore = ! process.noDeprecation

  if (shouldRestore) {
    descriptor = getOwnPropertyDescriptor(process, "noDeprecation")

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
      defineProperty(process, "noDeprecation", descriptor)
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
