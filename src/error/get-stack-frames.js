import getBuiltinErrorConstructor from "./get-builtin-error-constructor.js"
import isError from "../util/is-error.js"
import setProperty from "../util/set-property.js"
import shared from "../shared.js"
import toExternalFunction from "../util/to-external-function.js"

function init() {
  "use sloppy"

  const getStructuredStackTrace = toExternalFunction((error, trace) => trace)

  function getStackFrames(error) {
    if (! isError(error)) {
      return []
    }

    const BuiltinError = getBuiltinErrorConstructor(error)
    const prepareStackTraceDescriptor = Reflect.getOwnPropertyDescriptor(BuiltinError, "prepareStackTrace")

    setProperty(BuiltinError, "prepareStackTrace", getStructuredStackTrace)

    const { stack } = error

    if (prepareStackTraceDescriptor === void 0) {
      Reflect.deleteProperty(BuiltinError, "prepareStackTrace")
    } else {
      Reflect.defineProperty(BuiltinError, "prepareStackTrace", prepareStackTraceDescriptor)
    }

    return Array.isArray(stack) ? stack : []
  }

  return getStackFrames
}

export default shared.inited
  ? shared.module.errorGetStackFrames
  : shared.module.errorGetStackFrames = init()
