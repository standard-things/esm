import isError from "../util/is-error.js"
import isNative from "../util/is-native.js"
import shared from "../shared.js"

function init() {
  "use sloppy"

  function getStackFrames(error) {
    if (! isError(error)) {
      return []
    }

    const Ctor = getErrorConstructor(error)

    return Ctor
      ? tryGetStackFrames(Ctor)
      : []
  }

  function getErrorConstructor(error) {
    let proto = error

    while ((proto = Reflect.getPrototypeOf(proto))) {
      const ctor = proto ? proto.constructor : void 0

      if (typeof ctor === "function" &&
          ctor.name === "Error" &&
          isNative(ctor)) {
        return ctor
      }
    }

    return null
  }

  function getStructuredStackTrace(error, structuredStackTrace) {
    return structuredStackTrace
  }

  function tryGetStackFrames(BuiltinError) {
    try {
      const descriptor = Reflect.getOwnPropertyDescriptor(BuiltinError, "prepareStackTrace")
      const { prepareStackTrace } = BuiltinError
      const error = new BuiltinError

      BuiltinError.prepareStackTrace = getStructuredStackTrace

      const { stack } = error

      if (descriptor &&
          typeof prepareStackTrace === "function") {
        Reflect.defineProperty(BuiltinError, "prepareStackTrace", descriptor)
      } else {
        Reflect.deleteProperty(BuiltinError, "prepareStackTrace")
      }

      if (Array.isArray(stack)) {
        return stack
      }
    } catch {}

    return []
  }

  return getStackFrames
}

export default shared.inited
  ? shared.module.errorGetStackFrames
  : shared.module.errorGetStackFrames = init()
