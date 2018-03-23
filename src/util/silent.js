const noDeprecationDescriptor = {
  __proto__: null,
  configurable: true,
  value: true
}

function silent(callback) {
  const oldDescriptor = Reflect.getOwnPropertyDescriptor(process, "noDeprecation")

  Reflect.defineProperty(process, "noDeprecation", noDeprecationDescriptor)

  try {
    return callback()
  } finally {
    if (oldDescriptor) {
      Reflect.defineProperty(process, "noDeprecation", oldDescriptor)
    } else {
      Reflect.deleteProperty(process, "noDeprecation")
    }
  }
}

export default silent
