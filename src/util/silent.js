import realProcess from "../real/process.js"
import shared from "../shared.js"

function init() {
  const noDeprecationDescriptor = {
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

  return silent
}

export default shared.inited
  ? shared.module.utilSilent
  : shared.module.utilSilent = init()
