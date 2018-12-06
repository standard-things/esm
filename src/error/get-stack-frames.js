import getBuiltinErrorConstructor from "./get-builtin-error-constructor.js"
import isError from "../util/is-error.js"
import setProperty from "../util/set-property.js"
import shared from "../shared.js"

function init() {
  "use sloppy"

  function getStackFrames(error) {
    if (! isError(error)) {
      return []
    }

    const BuiltinError = getBuiltinErrorConstructor(error)
    const descriptor = Reflect.getOwnPropertyDescriptor(BuiltinError, "prepareStackTrace")

    setProperty(BuiltinError, "prepareStackTrace", getStructuredStackTrace)

    const { stack } = error

    if (descriptor === void 0) {
      Reflect.deleteProperty(BuiltinError, "prepareStackTrace")
    } else {
      Reflect.defineProperty(BuiltinError, "prepareStackTrace", descriptor)
    }

    return Array.isArray(stack) ? stack : []
  }

  function getStructuredStackTrace(error, structuredStackTrace) {
    return structuredStackTrace
  }

  return getStackFrames
}

export default shared.inited
  ? shared.module.errorGetStackFrames
  : shared.module.errorGetStackFrames = init()
