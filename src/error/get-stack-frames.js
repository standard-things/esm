import isError from "../util/is-error.js"
import isNative from "../util/is-native.js"
import setProperty from "../util/set-property.js"
import shared from "../shared.js"

function init() {
  "use sloppy"

  const ExError = shared.external.Error

  function getStackFrames(error) {
    if (! isError(error)) {
      return []
    }

    const BuiltinError = getErrorConstructor(error)
    const descriptor = Reflect.getOwnPropertyDescriptor(BuiltinError, "prepareStackTrace")

    setProperty(BuiltinError, "prepareStackTrace", getStructuredStackTrace)

    const { stack } = error

    if (descriptor) {
      Reflect.defineProperty(BuiltinError, "prepareStackTrace", descriptor)
    } else {
      Reflect.deleteProperty(BuiltinError, "prepareStackTrace")
    }

    return Array.isArray(stack) ? stack : []
  }

  function getErrorConstructor(error) {
    let proto = error

    while ((proto = Reflect.getPrototypeOf(proto))) {
      const ctor = proto ? proto.constructor : void 0

      if (ctor === Error ||
          ctor === ExError ||
          (typeof ctor === "function" &&
           ctor.name === "Error" &&
           isNative(ctor))) {
        return ctor
      }
    }

    return ExError
  }

  function getStructuredStackTrace(error, structuredStackTrace) {
    return structuredStackTrace
  }

  return getStackFrames
}

export default shared.inited
  ? shared.module.errorGetStackFrames
  : shared.module.errorGetStackFrames = init()
