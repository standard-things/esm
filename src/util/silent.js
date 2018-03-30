import realProcess from "../real/process.js"

const noDeprecationDescriptor = {
  __proto__: null,
  configurable: true,
  value: true
}

function silent(callback) {
  const oldDescriptor = Reflect.getOwnPropertyDescriptor(realProcess, "noDeprecation")

  Reflect.defineProperty(realProcess, "noDeprecation", noDeprecationDescriptor)

  try {
    return callback()
  } finally {
    if (oldDescriptor) {
      Reflect.defineProperty(realProcess, "noDeprecation", oldDescriptor)
    } else {
      Reflect.deleteProperty(realProcess, "noDeprecation")
    }
  }
}

export default silent
