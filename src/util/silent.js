import realProcess from "../real/process.js"
import setProperty from "./set-property.js"
import shared from "../shared.js"

function init() {
  function silent(callback) {
    const descriptor = Reflect.getOwnPropertyDescriptor(realProcess, "noDeprecation")

    setProperty(realProcess, "noDeprecation", true)

    try {
      return callback()
    } finally {
      if (descriptor === void 0) {
        Reflect.deleteProperty(realProcess, "noDeprecation")
      } else {
        Reflect.defineProperty(realProcess, "noDeprecation", descriptor)
      }
    }
  }

  return silent
}

export default shared.inited
  ? shared.module.utilSilent
  : shared.module.utilSilent = init()
