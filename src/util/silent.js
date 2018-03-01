const noDeprecationDescriptor = {
  __proto__: null,
  configurable: true,
  value: true
}

function silent(callback) {
  let oldDescriptor

  const shouldRestore = ! process.noDeprecation

  if (shouldRestore) {
    oldDescriptor = Reflect.getOwnPropertyDescriptor(process, "noDeprecation")

    if (oldDescriptor) {
      Reflect.defineProperty(process, "noDeprecation", noDeprecationDescriptor)
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
      Reflect.defineProperty(process, "noDeprecation", oldDescriptor)
    } else {
      Reflect.deleteProperty(process, "noDeprecation")
    }
  }

  return result
}

export default silent
